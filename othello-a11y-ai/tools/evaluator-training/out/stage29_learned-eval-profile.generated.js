const GENERATED_EVALUATION_PROFILE = Object.freeze({
  "version": 1,
  "name": "trained-phase-linear-v1",
  "description": "회귀 기반으로 재추정한 phase-bucket linear evaluator입니다.",
  "source": {
    "inputFiles": [
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000000.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000001.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000002.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000003.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000004.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000005.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000006.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000007.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000008.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000009.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000010.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000011.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000012.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000013.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000014.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000015.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000016.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000017.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000018.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000019.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000020.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000021.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000022.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000023.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000024.txt",
      "C:\\Downloads\\othello-a11y-ai-stage26-learned-eval\\othello-a11y-ai-stage25\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000025.txt"
    ],
    "targetScale": 3000,
    "holdoutMod": 10,
    "holdoutResidue": 0,
    "regularization": 5000,
    "seenSamples": 25514097
  },
  "diagnostics": {
    "trainCountsByBucket": [
      {
        "key": "opening-a",
        "minEmpties": 52,
        "maxEmpties": 60,
        "trainCount": 72107,
        "holdoutCount": 7961
      },
      {
        "key": "opening-b",
        "minEmpties": 44,
        "maxEmpties": 51,
        "trainCount": 3540649,
        "holdoutCount": 393380
      },
      {
        "key": "midgame-a",
        "minEmpties": 36,
        "maxEmpties": 43,
        "trainCount": 3600056,
        "holdoutCount": 399944
      },
      {
        "key": "midgame-b",
        "minEmpties": 28,
        "maxEmpties": 35,
        "trainCount": 3600089,
        "holdoutCount": 399911
      },
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "trainCount": 3599593,
        "holdoutCount": 400407
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "trainCount": 3150301,
        "holdoutCount": 349699
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "trainCount": 2700422,
        "holdoutCount": 299578
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "trainCount": 2699470,
        "holdoutCount": 300530
      }
    ],
    "all": {
      "count": 25514097,
      "mae": 18651.490425195138,
      "rmse": 24372.89129055879,
      "meanResidual": 10.341329461904923,
      "stdDevResidual": 24372.88909666438,
      "maxAbsResidual": 419087,
      "maeInStones": 6.217163475065046,
      "rmseInStones": 8.12429709685293,
      "meanResidualInStones": 0.0034471098206349743,
      "stdDevResidualInStones": 8.124296365554795,
      "maxAbsResidualInStones": 139.69566666666665
    },
    "holdout": {
      "count": 2551410,
      "mae": 18663.84956239883,
      "rmse": 24390.472380962037,
      "meanResidual": 2.382684084486617,
      "stdDevResidual": 24390.472264580865,
      "maxAbsResidual": 355000,
      "maeInStones": 6.221283187466277,
      "rmseInStones": 8.13015746032068,
      "meanResidualInStones": 0.0007942280281622057,
      "stdDevResidualInStones": 8.130157421526954,
      "maxAbsResidualInStones": 118.33333333333333
    },
    "byBucket": [
      {
        "key": "opening-a",
        "minEmpties": 52,
        "maxEmpties": 60,
        "trainCount": 72107,
        "holdoutCount": 7961,
        "mpcResidualMean": 104.35209144579827,
        "mpcResidualStdDev": 15625.901575452659,
        "holdout": {
          "count": 7961,
          "mae": 11200.210400703429,
          "rmse": 15626.25001095026,
          "meanResidual": 104.35209144579827,
          "stdDevResidual": 15625.901575452659,
          "maxAbsResidual": 275783,
          "maeInStones": 3.7334034669011427,
          "rmseInStones": 5.208750003650087
        },
        "all": {
          "count": 80068,
          "mae": 11344.95905979917,
          "rmse": 15995.568118585352,
          "meanResidual": 119.02867562571814,
          "stdDevResidual": 15995.125245232777,
          "maxAbsResidual": 294115,
          "maeInStones": 3.7816530199330565,
          "rmseInStones": 5.331856039528451
        }
      },
      {
        "key": "opening-b",
        "minEmpties": 44,
        "maxEmpties": 51,
        "trainCount": 3540649,
        "holdoutCount": 393380,
        "mpcResidualMean": -31.626557018658804,
        "mpcResidualStdDev": 20421.554928133057,
        "holdout": {
          "count": 393380,
          "mae": 14916.068974020032,
          "rmse": 20421.57941790655,
          "meanResidual": -31.626557018658804,
          "stdDevResidual": 20421.554928133057,
          "maxAbsResidual": 346296,
          "maeInStones": 4.972022991340011,
          "rmseInStones": 6.807193139302183
        },
        "all": {
          "count": 3934029,
          "mae": 14917.697799380736,
          "rmse": 20446.57168895381,
          "meanResidual": 5.6968258241106,
          "stdDevResidual": 20446.570895328707,
          "maxAbsResidual": 419087,
          "maeInStones": 4.972565933126912,
          "rmseInStones": 6.815523896317936
        }
      },
      {
        "key": "midgame-a",
        "minEmpties": 36,
        "maxEmpties": 43,
        "trainCount": 3600056,
        "holdoutCount": 399944,
        "mpcResidualMean": 53.76026643730122,
        "mpcResidualStdDev": 22130.277509484407,
        "holdout": {
          "count": 399944,
          "mae": 16528.474176384694,
          "rmse": 22130.34280830369,
          "meanResidual": 53.76026643730122,
          "stdDevResidual": 22130.277509484407,
          "maxAbsResidual": 355000,
          "maeInStones": 5.509491392128232,
          "rmseInStones": 7.3767809361012295
        },
        "all": {
          "count": 4000000,
          "mae": 16489.854686,
          "rmse": 22050.01006491318,
          "meanResidual": 18.6511715,
          "stdDevResidual": 22050.002176792957,
          "maxAbsResidual": 403285,
          "maeInStones": 5.496618228666666,
          "rmseInStones": 7.35000335497106
        }
      },
      {
        "key": "midgame-b",
        "minEmpties": 28,
        "maxEmpties": 35,
        "trainCount": 3600089,
        "holdoutCount": 399911,
        "mpcResidualMean": 37.98889252858761,
        "mpcResidualStdDev": 25047.307334424764,
        "holdout": {
          "count": 399911,
          "mae": 19052.986364466095,
          "rmse": 25047.336143012973,
          "meanResidual": 37.98889252858761,
          "stdDevResidual": 25047.307334424764,
          "maxAbsResidual": 253552,
          "maeInStones": 6.350995454822032,
          "rmseInStones": 8.34911204767099
        },
        "all": {
          "count": 4000000,
          "mae": 19067.03909225,
          "rmse": 25041.518233324794,
          "meanResidual": 16.15598425,
          "stdDevResidual": 25041.51302166287,
          "maxAbsResidual": 253552,
          "maeInStones": 6.355679697416667,
          "rmseInStones": 8.347172744441599
        }
      },
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "trainCount": 3599593,
        "holdoutCount": 400407,
        "mpcResidualMean": 12.251169435099786,
        "mpcResidualStdDev": 26817.78787436935,
        "holdout": {
          "count": 400407,
          "mae": 20927.3847110565,
          "rmse": 26817.790672719933,
          "meanResidual": 12.251169435099786,
          "stdDevResidual": 26817.78787436935,
          "maxAbsResidual": 212675,
          "maeInStones": 6.9757949036855,
          "rmseInStones": 8.93926355757331
        },
        "all": {
          "count": 4000000,
          "mae": 20937.25665575,
          "rmse": 26844.499301907956,
          "meanResidual": 11.54319675,
          "stdDevResidual": 26844.496820107197,
          "maxAbsResidual": 233660,
          "maeInStones": 6.979085551916667,
          "rmseInStones": 8.948166433969318
        }
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "trainCount": 3150301,
        "holdoutCount": 349699,
        "mpcResidualMean": -112.70411696916491,
        "mpcResidualStdDev": 27155.37244235551,
        "holdout": {
          "count": 349699,
          "mae": 21429.874643622086,
          "rmse": 27155.606321734427,
          "meanResidual": -112.70411696916491,
          "stdDevResidual": 27155.37244235551,
          "maxAbsResidual": 180665,
          "maeInStones": 7.143291547874028,
          "rmseInStones": 9.051868773911476
        },
        "all": {
          "count": 3500000,
          "mae": 21404.061378857143,
          "rmse": 27109.665833887568,
          "meanResidual": -1.5095165714285714,
          "stdDevResidual": 27109.665791861225,
          "maxAbsResidual": 236637,
          "maeInStones": 7.134687126285714,
          "rmseInStones": 9.036555277962522
        }
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "trainCount": 2700422,
        "holdoutCount": 299578,
        "mpcResidualMean": -13.41526080019227,
        "mpcResidualStdDev": 26231.677968123782,
        "holdout": {
          "count": 299578,
          "mae": 20823.697678067147,
          "rmse": 26231.68139850309,
          "meanResidual": -13.41526080019227,
          "stdDevResidual": 26231.677968123782,
          "maxAbsResidual": 150779,
          "maeInStones": 6.941232559355716,
          "rmseInStones": 8.74389379950103
        },
        "all": {
          "count": 3000000,
          "mae": 20795.154942333334,
          "rmse": 26195.852283221207,
          "meanResidual": 5.325427,
          "stdDevResidual": 26195.851741910836,
          "maxAbsResidual": 163534,
          "maeInStones": 6.931718314111111,
          "rmseInStones": 8.731950761073735
        }
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "trainCount": 2699470,
        "holdoutCount": 300530,
        "mpcResidualMean": 64.9599707183975,
        "mpcResidualStdDev": 22568.256472527606,
        "holdout": {
          "count": 300530,
          "mae": 17703.798795461353,
          "rmse": 22568.349962006083,
          "meanResidual": 64.9599707183975,
          "stdDevResidual": 22568.256472527606,
          "maxAbsResidual": 121634,
          "maeInStones": 5.901266265153784,
          "rmseInStones": 7.522783320668695
        },
        "all": {
          "count": 3000000,
          "mae": 17668.210192,
          "rmse": 22543.407915311294,
          "meanResidual": 11.937811333333334,
          "stdDevResidual": 22543.404754490402,
          "maxAbsResidual": 131379,
          "maeInStones": 5.889403397333333,
          "rmseInStones": 7.5144693051037645
        }
      }
    ],
    "createdAt": "2026-03-27T11:30:28.258Z"
  },
  "phaseBuckets": [
    {
      "key": "opening-a",
      "minEmpties": 52,
      "maxEmpties": 60,
      "weights": {
        "bias": -1739.928254,
        "mobility": 253.503727,
        "potentialMobility": 486.698428,
        "corners": 244.088809,
        "cornerAccess": -1.225074,
        "cornerMoveBalance": -7.361688,
        "cornerAdjacency": 17.796848,
        "cornerOrthAdjacency": 32.902503,
        "cornerDiagonalAdjacency": 237.89681,
        "frontier": 273.8732,
        "positional": 383.280965,
        "edgePattern": 883.573672,
        "cornerPattern": 3327.040377,
        "stability": -460.911191,
        "stableDiscDifferential": 137.500387,
        "discDifferential": 67.609334,
        "discDifferentialRaw": -1330.005916,
        "parity": 16.304151,
        "parityGlobal": 16.304151,
        "parityRegion": 16.304151
      }
    },
    {
      "key": "opening-b",
      "minEmpties": 44,
      "maxEmpties": 51,
      "weights": {
        "bias": -6970.52699,
        "mobility": 342.75035,
        "potentialMobility": 546.905064,
        "corners": 21.444105,
        "cornerAccess": 28.342769,
        "cornerMoveBalance": -2140.139938,
        "cornerAdjacency": 34.996656,
        "cornerOrthAdjacency": 127.390431,
        "cornerDiagonalAdjacency": 239.630337,
        "frontier": 688.707998,
        "positional": 341.053584,
        "edgePattern": -1248.263106,
        "cornerPattern": 2273.279501,
        "stability": 113.340617,
        "stableDiscDifferential": 13065.188431,
        "discDifferential": 544.750848,
        "discDifferentialRaw": -3576.358314,
        "parity": 18.418599,
        "parityGlobal": 18.418599,
        "parityRegion": 18.418599
      }
    },
    {
      "key": "midgame-a",
      "minEmpties": 36,
      "maxEmpties": 43,
      "weights": {
        "bias": -10620.593085,
        "mobility": 386.914735,
        "potentialMobility": 473.606829,
        "corners": 197.025032,
        "cornerAccess": 34.835397,
        "cornerMoveBalance": 3770.351295,
        "cornerAdjacency": 38.122815,
        "cornerOrthAdjacency": 120.979005,
        "cornerDiagonalAdjacency": 205.519344,
        "frontier": 891.223069,
        "positional": 241.619924,
        "edgePattern": -1267.978719,
        "cornerPattern": 1131.273713,
        "stability": 86.117868,
        "stableDiscDifferential": 11368.425191,
        "discDifferential": 322.054857,
        "discDifferentialRaw": -2281.34966,
        "parity": 17.765224,
        "parityGlobal": 17.765224,
        "parityRegion": 17.765224
      }
    },
    {
      "key": "midgame-b",
      "minEmpties": 28,
      "maxEmpties": 35,
      "weights": {
        "bias": -9886.319387,
        "mobility": 440.324456,
        "potentialMobility": 280.938059,
        "corners": 118.912255,
        "cornerAccess": 80.214499,
        "cornerMoveBalance": 6596.880533,
        "cornerAdjacency": -0.670305,
        "cornerOrthAdjacency": 71.609911,
        "cornerDiagonalAdjacency": 90.883635,
        "frontier": 969.574146,
        "positional": 163.329483,
        "edgePattern": -661.559119,
        "cornerPattern": 922.626758,
        "stability": 87.292518,
        "stableDiscDifferential": 7320.040363,
        "discDifferential": -262.012472,
        "discDifferentialRaw": -71.453252,
        "parity": 17.752056,
        "parityGlobal": 17.752056,
        "parityRegion": 17.752056
      }
    },
    {
      "key": "midgame-c",
      "minEmpties": 20,
      "maxEmpties": 27,
      "weights": {
        "bias": -8253.301713,
        "mobility": 576.683718,
        "potentialMobility": -22.143095,
        "corners": 101.94498,
        "cornerAccess": 31.203644,
        "cornerMoveBalance": 9337.338523,
        "cornerAdjacency": -31.308693,
        "cornerOrthAdjacency": 54.941932,
        "cornerDiagonalAdjacency": 30.469095,
        "frontier": 821.537568,
        "positional": 89.796401,
        "edgePattern": -266.349838,
        "cornerPattern": 759.96795,
        "stability": 62.475848,
        "stableDiscDifferential": 4139.506134,
        "discDifferential": -731.568946,
        "discDifferentialRaw": 978.002835,
        "parity": 18.512133,
        "parityGlobal": 18.512133,
        "parityRegion": 18.512133
      }
    },
    {
      "key": "late-a",
      "minEmpties": 13,
      "maxEmpties": 19,
      "weights": {
        "bias": -6825.848836,
        "mobility": 606.374909,
        "potentialMobility": -279.864079,
        "corners": 101.594705,
        "cornerAccess": 18.311727,
        "cornerMoveBalance": 8495.171914,
        "cornerAdjacency": -16.632546,
        "cornerOrthAdjacency": 42.507997,
        "cornerDiagonalAdjacency": -9.982257,
        "frontier": 642.127863,
        "positional": 35.080366,
        "edgePattern": -135.716739,
        "cornerPattern": 662.878263,
        "stability": 13.965033,
        "stableDiscDifferential": 3425.838517,
        "discDifferential": -579.967179,
        "discDifferentialRaw": 645.114544,
        "parity": 50.653864,
        "parityGlobal": 16.607626,
        "parityRegion": 47.73836
      }
    },
    {
      "key": "late-b",
      "minEmpties": 7,
      "maxEmpties": 12,
      "weights": {
        "bias": -3999.164761,
        "mobility": 506.24405,
        "potentialMobility": -319.476161,
        "corners": 98.03629,
        "cornerAccess": 15.447669,
        "cornerMoveBalance": 7104.794629,
        "cornerAdjacency": -12.880264,
        "cornerOrthAdjacency": 42.412662,
        "cornerDiagonalAdjacency": -30.408282,
        "frontier": 455.061453,
        "positional": 5.922032,
        "edgePattern": -95.564593,
        "cornerPattern": 504.72778,
        "stability": -34.715014,
        "stableDiscDifferential": 3024.178614,
        "discDifferential": -150.766709,
        "discDifferentialRaw": 119.948168,
        "parity": 40.003793,
        "parityGlobal": 24.241676,
        "parityRegion": 83.201252
      }
    },
    {
      "key": "endgame",
      "minEmpties": 0,
      "maxEmpties": 6,
      "weights": {
        "bias": -3258.142531,
        "mobility": 195.705442,
        "potentialMobility": -146.372944,
        "corners": 71.703505,
        "cornerAccess": -92.887277,
        "cornerMoveBalance": 13007.356571,
        "cornerAdjacency": 16.942444,
        "cornerOrthAdjacency": 12.064035,
        "cornerDiagonalAdjacency": -31.405703,
        "frontier": 220.454457,
        "positional": 0.42053,
        "edgePattern": -105.94683,
        "cornerPattern": 274.726347,
        "stability": -207.201367,
        "stableDiscDifferential": 3625.402184,
        "discDifferential": 4495.427394,
        "discDifferentialRaw": -7652.907556,
        "parity": -10906.176659,
        "parityGlobal": 2176.323488,
        "parityRegion": 8825.866746
      }
    }
  ]
});
const GENERATED_MOVE_ORDERING_PROFILE = Object.freeze({
  "version": 1,
  "name": "trained-move-ordering-linear-v1",
  "description": "late move-ordering evaluator를 root search teacher로 재추정한 프로필입니다.",
  "featureKeys": [
    "mobility",
    "corners",
    "cornerAdjacency",
    "edgePattern",
    "cornerPattern",
    "discDifferential",
    "parity"
  ],
  "source": {
    "inputFiles": [
      "/mnt/data/othello_stage29_repo/othello-a11y-ai-stage29/tools/evaluator-training/out/stage29_move_ordering_smoke_input_mixed.jsonl"
    ],
    "teacherEvaluationProfileName": "trained-phase-linear-v1",
    "teacherEvaluationProfilePath": null,
    "teacherMoveOrderingProfileName": null,
    "teacherMoveOrderingProfilePath": null,
    "regularization": 5000,
    "scannedSamples": 42,
    "eligibleRoots": 6,
    "acceptedRoots": 6
  },
  "diagnostics": {
    "bucketCounts": [
      {
        "key": "child-10-10",
        "minEmpties": 10,
        "maxEmpties": 10,
        "trainRootCount": 1,
        "holdoutRootCount": 1,
        "trainMoveCount": 9,
        "holdoutMoveCount": 6,
        "exactRootCount": 2,
        "depthRootCount": 0
      },
      {
        "key": "child-11-12",
        "minEmpties": 11,
        "maxEmpties": 12,
        "trainRootCount": 1,
        "holdoutRootCount": 1,
        "trainMoveCount": 11,
        "holdoutMoveCount": 8,
        "exactRootCount": 2,
        "depthRootCount": 0
      },
      {
        "key": "child-13-14",
        "minEmpties": 13,
        "maxEmpties": 14,
        "trainRootCount": 2,
        "holdoutRootCount": 0,
        "trainMoveCount": 16,
        "holdoutMoveCount": 0,
        "exactRootCount": 0,
        "depthRootCount": 2
      }
    ],
    "holdoutMoves": {
      "count": 14,
      "mae": 647850.8701037925,
      "rmse": 658635.5571549592,
      "meanResidual": 647850.8701037925,
      "stdDevResidual": 118701.50485390874,
      "maxAbsResidual": 930970.1698053351,
      "maeInDiscs": 64.78508701037926,
      "rmseInDiscs": 65.86355571549592
    },
    "holdoutRoots": {
      "count": 2,
      "top1Accuracy": 0.5,
      "top3Accuracy": 1,
      "meanBestRank": 1.5,
      "meanRegret": 30000,
      "meanRegretInDiscs": 3,
      "maxRegret": 60000,
      "maxRegretInDiscs": 6
    },
    "byBucket": [
      {
        "key": "child-10-10",
        "minEmpties": 10,
        "maxEmpties": 10,
        "holdoutMoves": {
          "count": 6,
          "mae": 614266.9813696104,
          "rmse": 618148.4669476433,
          "meanResidual": 614266.9813696104,
          "stdDevResidual": 69163.59438887145,
          "maxAbsResidual": 768875.9526496297,
          "maeInDiscs": 61.42669813696104,
          "rmseInDiscs": 61.814846694764334
        },
        "holdoutRoots": {
          "count": 1,
          "top1Accuracy": 0,
          "top3Accuracy": 1,
          "meanBestRank": 2,
          "meanRegret": 60000,
          "meanRegretInDiscs": 6,
          "maxRegret": 60000,
          "maxRegretInDiscs": 6
        }
      },
      {
        "key": "child-11-12",
        "minEmpties": 11,
        "maxEmpties": 12,
        "holdoutMoves": {
          "count": 8,
          "mae": 673038.7866544293,
          "rmse": 687437.8150917724,
          "meanResidual": 673038.7866544293,
          "stdDevResidual": 139962.64243319887,
          "maxAbsResidual": 930970.1698053351,
          "maeInDiscs": 67.30387866544292,
          "rmseInDiscs": 68.74378150917724
        },
        "holdoutRoots": {
          "count": 1,
          "top1Accuracy": 1,
          "top3Accuracy": 1,
          "meanBestRank": 1,
          "meanRegret": 0,
          "meanRegretInDiscs": 0,
          "maxRegret": 0,
          "maxRegretInDiscs": 0
        }
      },
      {
        "key": "child-13-14",
        "minEmpties": 13,
        "maxEmpties": 14,
        "holdoutMoves": {
          "count": 0,
          "mae": null,
          "rmse": null,
          "meanResidual": null,
          "stdDevResidual": null,
          "maxAbsResidual": null,
          "maeInDiscs": null,
          "rmseInDiscs": null
        },
        "holdoutRoots": {
          "count": 0,
          "top1Accuracy": null,
          "top3Accuracy": null,
          "meanBestRank": null,
          "meanRegret": null,
          "meanRegretInDiscs": null,
          "maxRegret": null,
          "maxRegretInDiscs": null
        }
      }
    ],
    "teacherConfig": {
      "exactRootMaxEmpties": 12,
      "exactRootTimeLimitMs": 15000,
      "teacherDepth": 4,
      "teacherTimeLimitMs": 800,
      "teacherExactEndgameEmpties": 10
    },
    "sampling": {
      "sampleStride": 1,
      "sampleResidue": 0,
      "maxRootsPerBucket": 2,
      "holdoutMod": 3,
      "holdoutResidue": 0
    },
    "scanSummary": {
      "scannedSamples": 42,
      "eligibleRoots": 6,
      "acceptedRoots": 6,
      "skipped": {
        "rootRange": 0,
        "noMoves": 0,
        "singleMove": 0,
        "stride": 0,
        "bucketFull": 36,
        "incomplete": 0,
        "timeout": 0,
        "depthShort": 0,
        "other": 0
      }
    },
    "createdAt": "2026-03-27T13:27:52.948Z"
  },
  "trainedBuckets": [
    {
      "key": "child-10-10",
      "minEmpties": 10,
      "maxEmpties": 10,
      "weights": {
        "mobility": 605.115185,
        "corners": 2229.189383,
        "cornerAdjacency": 377.444135,
        "edgePattern": 805.293808,
        "cornerPattern": 1112.288345,
        "discDifferential": -298.412356,
        "parity": 2744.350431
      }
    },
    {
      "key": "child-11-12",
      "minEmpties": 11,
      "maxEmpties": 12,
      "weights": {
        "mobility": 4486.081401,
        "corners": 540.338203,
        "cornerAdjacency": -3330.104941,
        "edgePattern": -4345.746677,
        "cornerPattern": 926.438466,
        "discDifferential": 260.343867,
        "parity": -1746.619017
      }
    },
    {
      "key": "child-13-14",
      "minEmpties": 13,
      "maxEmpties": 14,
      "weights": {
        "mobility": 1038.161549,
        "corners": -24.555185,
        "cornerAdjacency": 67.188474,
        "edgePattern": 1151.932903,
        "cornerPattern": -112.397806,
        "discDifferential": 184.931932,
        "parity": 0
      }
    }
  ]
});

export { GENERATED_EVALUATION_PROFILE, GENERATED_MOVE_ORDERING_PROFILE };
export default GENERATED_EVALUATION_PROFILE;
