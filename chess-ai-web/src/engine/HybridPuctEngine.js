class SearchNode {
  constructor({ hash, fen, move = null, prior = 1, depth = 0 }) {
    this.hash = hash;
    this.fen = fen;
    this.move = move;
    this.prior = prior;
    this.depth = depth;

    this.visits = 0;
    this.valueSum = 0;
    this.staticValue = 0;
    this.expanded = false;
    this.terminal = false;
    this.terminalValue = 0;

    this.children = [];
    this.childKeys = new Set();
    this.candidates = [];
    this.nextCandidateIndex = 0;
  }

  meanValue() {
    if (this.visits === 0) {
      return this.staticValue;
    }
    return this.valueSum / this.visits;
  }

  record(value) {
    this.visits += 1;
    this.valueSum += value;
  }

  maxChildren(config) {
    const progressiveCount = Math.floor(config.wideningBase + Math.sqrt(this.visits + 1) * config.wideningScale);
    return Math.min(this.candidates.length, Math.max(config.wideningBase, progressiveCount));
  }

  canExpandMore(config) {
    return this.nextCandidateIndex < this.maxChildren(config);
  }
}

function moveKey(move) {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

function sampleByTemperature(items, temperature) {
  if (items.length === 0) {
    return null;
  }

  if (temperature <= 0.05) {
    return items.reduce((best, item) => (item.weight > best.weight ? item : best), items[0]);
  }

  const adjustedWeights = items.map((item) => Math.pow(item.weight, 1 / Math.max(0.01, temperature)));
  const sum = adjustedWeights.reduce((total, value) => total + value, 0);
  let target = Math.random() * sum;

  for (let index = 0; index < items.length; index += 1) {
    target -= adjustedWeights[index];
    if (target <= 0) {
      return items[index];
    }
  }

  return items[items.length - 1];
}

export class HybridPuctEngine {
  constructor({
    adapter,
    evaluator,
    movePrior,
    transpositionTable,
    zobrist,
    openingBook = null,
    config,
    onProgress = null,
  }) {
    this.adapter = adapter;
    this.evaluator = evaluator;
    this.movePrior = movePrior;
    this.transpositionTable = transpositionTable;
    this.zobrist = zobrist;
    this.openingBook = openingBook;
    this.config = {
      ...config,
      tacticalBeamWidth: 6,
      heuristicBlend: 0.22,
    };
    this.onProgress = onProgress;
  }

  search(fen) {
    const bookChoice = this.openingBook?.getBookMove(fen, this.config.rootTemperature);
    if (bookChoice) {
      return {
        move: this.adapter.moveToInput(bookChoice.move),
        san: bookChoice.move.san,
        stats: {
          simulations: 0,
          elapsedMs: 0,
          evaluation: null,
          candidates: [
            {
              san: bookChoice.move.san,
              visits: 0,
              prior: 1,
              value: 0,
            },
          ],
        },
        pv: [bookChoice.move.san],
      };
    }

    const normalizedFen = this.adapter.normalizeFen(fen);
    const hash = this.zobrist.hashFen(normalizedFen);
    const root = new SearchNode({ hash, fen, depth: 0 });
    const rootChess = this.adapter.cloneFromFen(fen);
    this.expandNode(root, rootChess);

    if (root.terminal) {
      return {
        move: null,
        stats: {
          simulations: 0,
          elapsedMs: 0,
          evaluation: root.terminalValue,
          candidates: [],
        },
        pv: [],
      };
    }

    if (root.candidates.length === 1) {
      const onlyMove = root.candidates[0];
      return {
        move: this.adapter.moveToInput(onlyMove.move),
        san: onlyMove.move.san,
        stats: {
          simulations: 0,
          elapsedMs: 0,
          evaluation: root.staticValue,
          candidates: [{ san: onlyMove.move.san, visits: 0, value: root.staticValue, prior: onlyMove.prior }],
        },
        pv: [onlyMove.move.san],
      };
    }

    const startTime = performance.now();
    let lastProgressTime = startTime;
    let simulations = 0;

    while (
      simulations < this.config.maxSimulations &&
      performance.now() - startTime < this.config.timeBudgetMs
    ) {
      const searchChess = this.adapter.cloneFromFen(fen);
      this.simulate(root, searchChess);
      simulations += 1;

      const now = performance.now();
      if (this.onProgress && now - lastProgressTime >= 140) {
        lastProgressTime = now;
        this.onProgress({
          simulations,
          elapsedMs: Math.round(now - startTime),
          candidates: this.summarizeRoot(root),
        });
      }
    }

    const candidates = this.summarizeRoot(root);
    const best = this.chooseRootMove(root);
    const pv = this.principalVariation(best?.node ?? null);

    return {
      move: best ? this.adapter.moveToInput(best.node.move) : null,
      san: best?.node?.move?.san ?? '',
      stats: {
        simulations,
        elapsedMs: Math.round(performance.now() - startTime),
        evaluation: best ? -best.node.meanValue() : root.staticValue,
        candidates,
      },
      pv,
    };
  }

  simulate(node, chess) {
    if (node.terminal) {
      node.record(node.terminalValue);
      return node.terminalValue;
    }

    if (!node.expanded) {
      this.expandNode(node, chess);
      node.record(node.staticValue);
      return node.staticValue;
    }

    let child = null;

    if (node.canExpandMore(this.config)) {
      child = this.expandNextChild(node, chess);
    } else {
      child = this.selectChild(node);
      this.adapter.move(chess, child.move);
    }

    const childValue = this.simulate(child, chess);
    this.adapter.undo(chess);

    const value = -childValue;
    node.record(value);
    return value;
  }

  expandNode(node, chess) {
    const cached = this.transpositionTable.get(node.hash);
    if (cached) {
      node.expanded = true;
      node.terminal = cached.terminal;
      node.terminalValue = cached.terminalValue;
      node.staticValue = cached.staticValue;
      node.candidates = cached.candidates.map((candidate) => ({
        move: { ...candidate.move },
        prior: candidate.prior,
        rawScore: candidate.rawScore,
      }));
      node.nextCandidateIndex = 0;
      return;
    }

    if (this.adapter.isGameOver(chess)) {
      node.expanded = true;
      node.terminal = true;
      node.terminalValue = this.terminalValue(chess, node.depth);
      node.staticValue = node.terminalValue;
      this.transpositionTable.set(node.hash, {
        terminal: true,
        terminalValue: node.terminalValue,
        staticValue: node.staticValue,
        candidates: [],
      });
      return;
    }

    const legalMoves = this.adapter.moves(chess);
    const rankedCandidates = this.movePrior.rankMoves(chess, legalMoves);

    node.expanded = true;
    node.terminal = false;
    node.staticValue = this.evaluator.evaluate(chess, {
      tacticalDepth: this.config.tacticalDepth,
      tacticalBeamWidth: this.config.tacticalBeamWidth,
    });
    node.candidates = rankedCandidates;
    node.nextCandidateIndex = 0;

    this.transpositionTable.set(node.hash, {
      terminal: false,
      terminalValue: 0,
      staticValue: node.staticValue,
      candidates: rankedCandidates.map((candidate) => ({
        move: { ...candidate.move },
        prior: candidate.prior,
        rawScore: candidate.rawScore,
      })),
    });
  }

  expandNextChild(node, chess) {
    while (node.nextCandidateIndex < node.candidates.length) {
      const candidate = node.candidates[node.nextCandidateIndex];
      node.nextCandidateIndex += 1;
      const key = moveKey(candidate.move);

      if (node.childKeys.has(key)) {
        continue;
      }

      this.adapter.move(chess, candidate.move);
      const childFen = this.adapter.fen(chess);
      const childHash = this.zobrist.hashFen(this.adapter.normalizeFen(childFen));
      const childNode = new SearchNode({
        hash: childHash,
        fen: childFen,
        move: candidate.move,
        prior: candidate.prior,
        depth: node.depth + 1,
      });

      node.children.push(childNode);
      node.childKeys.add(key);
      return childNode;
    }

    const fallbackChild = this.selectChild(node);
    this.adapter.move(chess, fallbackChild.move);
    return fallbackChild;
  }

  selectChild(node) {
    const explorationBase = Math.sqrt(node.visits + 1);
    let bestChild = node.children[0];
    let bestScore = -Infinity;

    for (const child of node.children) {
      const blendedMean =
        (1 - this.config.heuristicBlend) * child.meanValue() +
        this.config.heuristicBlend * child.staticValue;
      const q = -blendedMean;
      const u = this.config.cpuct * child.prior * explorationBase / (1 + child.visits);
      const score = q + u;

      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }

    return bestChild;
  }

  chooseRootMove(root) {
    const candidates = root.children.map((child) => ({
      node: child,
      weight: Math.max(1e-6, child.visits),
    }));

    const sampled = sampleByTemperature(candidates, this.config.rootTemperature);
    if (!sampled) {
      return null;
    }

    if (this.config.rootTemperature <= 0.1) {
      return candidates.reduce((best, item) => {
        const bestValue = best ? best.weight : -Infinity;
        const bestNodeValue = best ? -best.node.meanValue() : -Infinity;
        const candidateValue = -item.node.meanValue();
        if (item.weight > bestValue) {
          return item;
        }
        if (item.weight === bestValue && candidateValue > bestNodeValue) {
          return item;
        }
        return best;
      }, sampled);
    }

    return sampled;
  }

  summarizeRoot(root) {
    return root.children
      .map((child) => ({
        san: child.move.san,
        visits: child.visits,
        prior: child.prior,
        value: -child.meanValue(),
      }))
      .sort((left, right) => right.visits - left.visits)
      .slice(0, 5);
  }

  principalVariation(startNode) {
    const line = [];
    let node = startNode;
    let safety = 0;

    while (node && safety < 8) {
      line.push(node.move?.san ?? '');
      if (!node.children || node.children.length === 0) {
        break;
      }
      node = node.children.reduce((best, child) => (child.visits > best.visits ? child : best), node.children[0]);
      safety += 1;
    }

    return line.filter(Boolean);
  }

  terminalValue(chess, depth) {
    if (this.adapter.isCheckmate(chess)) {
      return -1 + depth * 0.001;
    }
    return 0;
  }
}
