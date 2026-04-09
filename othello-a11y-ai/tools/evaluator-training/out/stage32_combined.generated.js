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
  "name": "trained-move-ordering-linear-v2",
  "description": "late move-ordering evaluator를 root-centered ranking 회귀와 진단 포함 파이프라인으로 재추정한 프로필입니다.",
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
      "/mnt/data/work_stage32/othello-a11y-ai-stage29/tools/evaluator-training/out/stage29_move_ordering_smoke_input_mixed.jsonl"
    ],
    "teacherEvaluationProfileName": "trained-phase-linear-v1",
    "teacherEvaluationProfilePath": "/mnt/data/work_stage32/othello-a11y-ai-stage29/tools/evaluator-training/out/trained-evaluation-profile.json",
    "teacherMoveOrderingProfileName": "trained-move-ordering-linear-v1",
    "teacherMoveOrderingProfilePath": null,
    "regularization": 5000,
    "scannedSamples": 42,
    "eligibleRoots": 6,
    "acceptedRoots": 6,
    "targetMode": "root-mean",
    "rootWeighting": "uniform",
    "exactRootWeightScale": 1,
    "excludedFeatureKeys": []
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
        "depthRootCount": 0,
        "rootWeightSum": 2
      },
      {
        "key": "child-11-12",
        "minEmpties": 11,
        "maxEmpties": 12,
        "trainRootCount": 1,
        "holdoutRootCount": 1,
        "trainMoveCount": 8,
        "holdoutMoveCount": 11,
        "exactRootCount": 2,
        "depthRootCount": 0,
        "rootWeightSum": 2
      },
      {
        "key": "child-13-14",
        "minEmpties": 13,
        "maxEmpties": 14,
        "trainRootCount": 1,
        "holdoutRootCount": 1,
        "trainMoveCount": 9,
        "holdoutMoveCount": 7,
        "exactRootCount": 2,
        "depthRootCount": 0,
        "rootWeightSum": 2
      }
    ],
    "holdoutMoves": {
      "targetMode": "root-mean",
      "count": 24,
      "mae": 59681.614741812664,
      "rmse": 69419.03490130029,
      "meanResidual": -22098.586268347233,
      "stdDevResidual": 65807.71149013133,
      "maxAbsResidual": 143764.60875563702,
      "maeInDiscs": 5.968161474181266,
      "rmseInDiscs": 6.941903490130029
    },
    "holdoutMovesRawAligned": {
      "alignment": "per-root-mean",
      "count": 24,
      "mae": 47188.984760223735,
      "rmse": 64814.52576087093,
      "meanResidual": -1.5158245029548805e-11,
      "stdDevResidual": 64814.52576087093,
      "maxAbsResidual": 157773.2490846091,
      "maeInDiscs": 4.718898476022374,
      "rmseInDiscs": 6.481452576087093
    },
    "holdoutRoots": {
      "count": 3,
      "top1Accuracy": 0.3333333333333333,
      "top3Accuracy": 1,
      "meanBestRank": 1.6666666666666667,
      "meanRegret": 53333.333333333336,
      "meanRegretInDiscs": 5.333333333333334,
      "maxRegret": 100000,
      "maxRegretInDiscs": 10
    },
    "holdoutPairwise": {
      "comparablePairs": 51,
      "correctPairs": 17,
      "tiedTeacherPairs": 40,
      "tiedPredictionPairs": 0,
      "accuracy": 0.3333333333333333,
      "weightedAccuracy": 0.24242424242424243,
      "maxTeacherGap": 100000
    },
    "featureContribution": {
      "overall": [
        {
          "key": "mobility",
          "count": 24,
          "meanContribution": 47132.64592509926,
          "meanAbsContribution": 91416.33897645527,
          "maxAbsContribution": 276069.40434160706,
          "absContributionShare": 0.35886791886593805
        },
        {
          "key": "corners",
          "count": 24,
          "meanContribution": 5954.8134893171045,
          "meanAbsContribution": 6740.849337167973,
          "maxAbsContribution": 80829.81951460613,
          "absContributionShare": 0.026462168580622697
        },
        {
          "key": "cornerAdjacency",
          "count": 24,
          "meanContribution": 30032.35815010524,
          "meanAbsContribution": 30032.35815010524,
          "maxAbsContribution": 335752.08638583636,
          "absContributionShare": 0.11789631906765154
        },
        {
          "key": "edgePattern",
          "count": 24,
          "meanContribution": -5330.310793605505,
          "meanAbsContribution": 13747.005376632724,
          "maxAbsContribution": 100026.75749319803,
          "absContributionShare": 0.05396583658225099
        },
        {
          "key": "cornerPattern",
          "count": 24,
          "meanContribution": 632.763588771156,
          "meanAbsContribution": 9496.196657089613,
          "maxAbsContribution": 32410.249145644026,
          "absContributionShare": 0.03727867873104329
        },
        {
          "key": "discDifferential",
          "count": 24,
          "meanContribution": 903.2891966260867,
          "meanAbsContribution": 1878.4391268658962,
          "maxAbsContribution": 6708.969996125666,
          "absContributionShare": 0.007374081567063572
        },
        {
          "key": "parity",
          "count": 24,
          "meanContribution": -101424.14582466059,
          "meanAbsContribution": 101424.14582466059,
          "maxAbsContribution": 214554.4032096443,
          "absContributionShare": 0.39815499660542975
        }
      ],
      "byBucket": [
        {
          "key": "child-10-10",
          "minEmpties": 10,
          "maxEmpties": 10,
          "features": [
            {
              "key": "mobility",
              "count": 6,
              "meanContribution": -12584.406628021714,
              "meanAbsContribution": 12584.406628021714,
              "maxAbsContribution": 15015.485181162272,
              "absContributionShare": 0.22154340173380804
            },
            {
              "key": "corners",
              "count": 6,
              "meanContribution": 13471.636585767688,
              "meanAbsContribution": 13471.636585767688,
              "maxAbsContribution": 80829.81951460613,
              "absContributionShare": 0.23716272720295697
            },
            {
              "key": "cornerAdjacency",
              "count": 6,
              "meanContribution": 0,
              "meanAbsContribution": 0,
              "maxAbsContribution": 0,
              "absContributionShare": 0
            },
            {
              "key": "edgePattern",
              "count": 6,
              "meanContribution": 1275.6514229104469,
              "meanAbsContribution": 5244.344738631836,
              "maxAbsContribution": 19559.988484626847,
              "absContributionShare": 0.09232457338705208
            },
            {
              "key": "cornerPattern",
              "count": 6,
              "meanContribution": -6466.805501378371,
              "meanAbsContribution": 12553.210679146252,
              "maxAbsContribution": 18259.21553330364,
              "absContributionShare": 0.22099420963930005
            },
            {
              "key": "discDifferential",
              "count": 6,
              "meanContribution": 361.74231188149815,
              "meanAbsContribution": 602.9038531358302,
              "maxAbsContribution": 1446.9692475259926,
              "absContributionShare": 0.010613879103740415
            },
            {
              "key": "parity",
              "count": 6,
              "meanContribution": -12346.844080961075,
              "meanAbsContribution": 12346.844080961075,
              "maxAbsContribution": 12346.844080961073,
              "absContributionShare": 0.21736120893314237
            }
          ]
        },
        {
          "key": "child-11-12",
          "minEmpties": 11,
          "maxEmpties": 12,
          "features": [
            {
              "key": "mobility",
              "count": 11,
              "meanContribution": 140786.76489566153,
              "meanAbsContribution": 161501.92943500288,
              "maxAbsContribution": 276069.40434160706,
              "absContributionShare": 0.33280463090677315
            },
            {
              "key": "corners",
              "count": 11,
              "meanContribution": 6501.648582110435,
              "meanAbsContribution": 6501.648582110435,
              "maxAbsContribution": 71518.13440321479,
              "absContributionShare": 0.013397850813451921
            },
            {
              "key": "cornerAdjacency",
              "count": 11,
              "meanContribution": 64098.12558275058,
              "meanAbsContribution": 64098.12558275058,
              "maxAbsContribution": 335752.08638583636,
              "absContributionShare": 0.13208605681066188
            },
            {
              "key": "edgePattern",
              "count": 11,
              "meanContribution": -17277.34902155239,
              "meanAbsContribution": 21520.90843035473,
              "maxAbsContribution": 100026.75749319803,
              "absContributionShare": 0.04434781684651729
            },
            {
              "key": "cornerPattern",
              "count": 11,
              "meanContribution": 4939.52995000457,
              "meanAbsContribution": 13605.37196755645,
              "maxAbsContribution": 32410.249145644026,
              "absContributionShare": 0.028036388245344563
            },
            {
              "key": "discDifferential",
              "count": 11,
              "meanContribution": 1497.0428916974624,
              "meanAbsContribution": 3493.1000806274114,
              "maxAbsContribution": 6708.969996125666,
              "absContributionShare": 0.0071981795333379344
            },
            {
              "key": "parity",
              "count": 11,
              "meanContribution": -214554.40320964434,
              "meanAbsContribution": 214554.40320964434,
              "maxAbsContribution": 214554.4032096443,
              "absContributionShare": 0.44212907684391334
            }
          ]
        },
        {
          "key": "child-13-14",
          "minEmpties": 13,
          "maxEmpties": 14,
          "features": [
            {
              "key": "mobility",
              "count": 7,
              "meanContribution": -48852.06741168063,
              "meanAbsContribution": 48852.06741168063,
              "maxAbsContribution": 62706.29416977973,
              "absContributionShare": 0.7864912336555072
            },
            {
              "key": "corners",
              "count": 7,
              "meanContribution": -1347.490024887204,
              "meanAbsContribution": 1347.490024887204,
              "maxAbsContribution": 9432.430174210429,
              "absContributionShare": 0.021693843232489882
            },
            {
              "key": "cornerAdjacency",
              "count": 7,
              "meanContribution": 2242.459170324194,
              "meanAbsContribution": 2242.459170324194,
              "maxAbsContribution": 4281.058416073462,
              "absContributionShare": 0.03610235088778827
            },
            {
              "key": "edgePattern",
              "count": 7,
              "meanContribution": 7781.353093297353,
              "meanAbsContribution": 8818.866839070333,
              "maxAbsContribution": 27234.73582654073,
              "absContributionShare": 0.14197887269036372
            },
            {
              "key": "cornerPattern",
              "count": 7,
              "meanContribution": -49.66718732461413,
              "meanAbsContribution": 418.6234360217477,
              "maxAbsContribution": 1291.3468704399675,
              "absContributionShare": 0.006739605508591614
            },
            {
              "key": "discDifferential",
              "count": 7,
              "meanContribution": 434.43071986642923,
              "meanAbsContribution": 434.43071986642923,
              "maxAbsContribution": 906.9693976158785,
              "absContributionShare": 0.0069940940252592575
            },
            {
              "key": "parity",
              "count": 7,
              "meanContribution": 0,
              "meanAbsContribution": 0,
              "maxAbsContribution": 0,
              "absContributionShare": 0
            }
          ]
        }
      ]
    },
    "ablationAudit": {
      "overall": {
        "baseline": {
          "holdoutRoots": {
            "count": 3,
            "top1Accuracy": 0.3333333333333333,
            "top3Accuracy": 1,
            "meanBestRank": 1.6666666666666667,
            "meanRegret": 53333.333333333336,
            "meanRegretInDiscs": 5.333333333333334,
            "maxRegret": 100000,
            "maxRegretInDiscs": 10
          },
          "pairwise": {
            "comparablePairs": 51,
            "correctPairs": 17,
            "tiedTeacherPairs": 40,
            "tiedPredictionPairs": 0,
            "accuracy": 0.3333333333333333,
            "weightedAccuracy": 0.24242424242424243,
            "maxTeacherGap": 100000
          }
        },
        "byFeature": [
          {
            "key": "mobility",
            "holdoutRoots": {
              "count": 3,
              "top1Accuracy": 0.3333333333333333,
              "top3Accuracy": 1,
              "meanBestRank": 1.6666666666666667,
              "meanRegret": 26666.666666666668,
              "meanRegretInDiscs": 2.666666666666667,
              "maxRegret": 60000,
              "maxRegretInDiscs": 6
            },
            "pairwise": {
              "comparablePairs": 51,
              "correctPairs": 11,
              "tiedTeacherPairs": 40,
              "tiedPredictionPairs": 0,
              "accuracy": 0.21568627450980393,
              "weightedAccuracy": 0.26262626262626265,
              "maxTeacherGap": 100000
            },
            "deltas": {
              "top1Accuracy": 0,
              "top3Accuracy": 0,
              "meanRegret": -26666.666666666668,
              "pairwiseAccuracy": -0.11764705882352938,
              "weightedPairwiseAccuracy": 0.02020202020202022
            }
          },
          {
            "key": "corners",
            "holdoutRoots": {
              "count": 3,
              "top1Accuracy": 0.3333333333333333,
              "top3Accuracy": 1,
              "meanBestRank": 1.6666666666666667,
              "meanRegret": 53333.333333333336,
              "meanRegretInDiscs": 5.333333333333334,
              "maxRegret": 100000,
              "maxRegretInDiscs": 10
            },
            "pairwise": {
              "comparablePairs": 51,
              "correctPairs": 13,
              "tiedTeacherPairs": 40,
              "tiedPredictionPairs": 0,
              "accuracy": 0.2549019607843137,
              "weightedAccuracy": 0.1919191919191919,
              "maxTeacherGap": 100000
            },
            "deltas": {
              "top1Accuracy": 0,
              "top3Accuracy": 0,
              "meanRegret": 0,
              "pairwiseAccuracy": -0.0784313725490196,
              "weightedPairwiseAccuracy": -0.050505050505050525
            }
          },
          {
            "key": "cornerAdjacency",
            "holdoutRoots": {
              "count": 3,
              "top1Accuracy": 0.3333333333333333,
              "top3Accuracy": 1,
              "meanBestRank": 1.6666666666666667,
              "meanRegret": 53333.333333333336,
              "meanRegretInDiscs": 5.333333333333334,
              "maxRegret": 100000,
              "maxRegretInDiscs": 10
            },
            "pairwise": {
              "comparablePairs": 51,
              "correctPairs": 23,
              "tiedTeacherPairs": 40,
              "tiedPredictionPairs": 0,
              "accuracy": 0.45098039215686275,
              "weightedAccuracy": 0.32323232323232326,
              "maxTeacherGap": 100000
            },
            "deltas": {
              "top1Accuracy": 0,
              "top3Accuracy": 0,
              "meanRegret": 0,
              "pairwiseAccuracy": 0.11764705882352944,
              "weightedPairwiseAccuracy": 0.08080808080808083
            }
          },
          {
            "key": "edgePattern",
            "holdoutRoots": {
              "count": 3,
              "top1Accuracy": 0.3333333333333333,
              "top3Accuracy": 1,
              "meanBestRank": 1.6666666666666667,
              "meanRegret": 53333.333333333336,
              "meanRegretInDiscs": 5.333333333333334,
              "maxRegret": 100000,
              "maxRegretInDiscs": 10
            },
            "pairwise": {
              "comparablePairs": 51,
              "correctPairs": 19,
              "tiedTeacherPairs": 40,
              "tiedPredictionPairs": 0,
              "accuracy": 0.37254901960784315,
              "weightedAccuracy": 0.2727272727272727,
              "maxTeacherGap": 100000
            },
            "deltas": {
              "top1Accuracy": 0,
              "top3Accuracy": 0,
              "meanRegret": 0,
              "pairwiseAccuracy": 0.03921568627450983,
              "weightedPairwiseAccuracy": 0.030303030303030276
            }
          },
          {
            "key": "cornerPattern",
            "holdoutRoots": {
              "count": 3,
              "top1Accuracy": 0.3333333333333333,
              "top3Accuracy": 1,
              "meanBestRank": 1.6666666666666667,
              "meanRegret": 53333.333333333336,
              "meanRegretInDiscs": 5.333333333333334,
              "maxRegret": 100000,
              "maxRegretInDiscs": 10
            },
            "pairwise": {
              "comparablePairs": 51,
              "correctPairs": 16,
              "tiedTeacherPairs": 40,
              "tiedPredictionPairs": 1,
              "accuracy": 0.3137254901960784,
              "weightedAccuracy": 0.21212121212121213,
              "maxTeacherGap": 100000
            },
            "deltas": {
              "top1Accuracy": 0,
              "top3Accuracy": 0,
              "meanRegret": 0,
              "pairwiseAccuracy": -0.019607843137254888,
              "weightedPairwiseAccuracy": -0.030303030303030304
            }
          },
          {
            "key": "discDifferential",
            "holdoutRoots": {
              "count": 3,
              "top1Accuracy": 0.3333333333333333,
              "top3Accuracy": 1,
              "meanBestRank": 1.6666666666666667,
              "meanRegret": 53333.333333333336,
              "meanRegretInDiscs": 5.333333333333334,
              "maxRegret": 100000,
              "maxRegretInDiscs": 10
            },
            "pairwise": {
              "comparablePairs": 51,
              "correctPairs": 16,
              "tiedTeacherPairs": 40,
              "tiedPredictionPairs": 0,
              "accuracy": 0.3137254901960784,
              "weightedAccuracy": 0.2222222222222222,
              "maxTeacherGap": 100000
            },
            "deltas": {
              "top1Accuracy": 0,
              "top3Accuracy": 0,
              "meanRegret": 0,
              "pairwiseAccuracy": -0.019607843137254888,
              "weightedPairwiseAccuracy": -0.02020202020202022
            }
          },
          {
            "key": "parity",
            "holdoutRoots": {
              "count": 3,
              "top1Accuracy": 0.3333333333333333,
              "top3Accuracy": 1,
              "meanBestRank": 1.6666666666666667,
              "meanRegret": 53333.333333333336,
              "meanRegretInDiscs": 5.333333333333334,
              "maxRegret": 100000,
              "maxRegretInDiscs": 10
            },
            "pairwise": {
              "comparablePairs": 51,
              "correctPairs": 17,
              "tiedTeacherPairs": 40,
              "tiedPredictionPairs": 0,
              "accuracy": 0.3333333333333333,
              "weightedAccuracy": 0.24242424242424243,
              "maxTeacherGap": 100000
            },
            "deltas": {
              "top1Accuracy": 0,
              "top3Accuracy": 0,
              "meanRegret": 0,
              "pairwiseAccuracy": 0,
              "weightedPairwiseAccuracy": 0
            }
          }
        ]
      },
      "byBucket": [
        {
          "key": "child-10-10",
          "minEmpties": 10,
          "maxEmpties": 10,
          "baseline": {
            "holdoutRoots": {
              "count": 1,
              "top1Accuracy": 0,
              "top3Accuracy": 1,
              "meanBestRank": 2,
              "meanRegret": 60000,
              "meanRegretInDiscs": 6,
              "maxRegret": 60000,
              "maxRegretInDiscs": 6
            },
            "pairwise": {
              "comparablePairs": 9,
              "correctPairs": 2,
              "tiedTeacherPairs": 6,
              "tiedPredictionPairs": 0,
              "accuracy": 0.2222222222222222,
              "weightedAccuracy": 0.19047619047619047,
              "maxTeacherGap": 60000
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 60000,
                "meanRegretInDiscs": 6,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 9,
                "correctPairs": 1,
                "tiedTeacherPairs": 6,
                "tiedPredictionPairs": 0,
                "accuracy": 0.1111111111111111,
                "weightedAccuracy": 0.09523809523809523,
                "maxTeacherGap": 60000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.1111111111111111,
                "weightedPairwiseAccuracy": -0.09523809523809523
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 60000,
                "meanRegretInDiscs": 6,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 9,
                "correctPairs": 2,
                "tiedTeacherPairs": 6,
                "tiedPredictionPairs": 0,
                "accuracy": 0.2222222222222222,
                "weightedAccuracy": 0.19047619047619047,
                "maxTeacherGap": 60000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 60000,
                "meanRegretInDiscs": 6,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 9,
                "correctPairs": 2,
                "tiedTeacherPairs": 6,
                "tiedPredictionPairs": 0,
                "accuracy": 0.2222222222222222,
                "weightedAccuracy": 0.19047619047619047,
                "maxTeacherGap": 60000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 60000,
                "meanRegretInDiscs": 6,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 9,
                "correctPairs": 2,
                "tiedTeacherPairs": 6,
                "tiedPredictionPairs": 0,
                "accuracy": 0.2222222222222222,
                "weightedAccuracy": 0.19047619047619047,
                "maxTeacherGap": 60000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 60000,
                "meanRegretInDiscs": 6,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 9,
                "correctPairs": 1,
                "tiedTeacherPairs": 6,
                "tiedPredictionPairs": 1,
                "accuracy": 0.1111111111111111,
                "weightedAccuracy": 0.09523809523809523,
                "maxTeacherGap": 60000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.1111111111111111,
                "weightedPairwiseAccuracy": -0.09523809523809523
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 60000,
                "meanRegretInDiscs": 6,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 9,
                "correctPairs": 1,
                "tiedTeacherPairs": 6,
                "tiedPredictionPairs": 0,
                "accuracy": 0.1111111111111111,
                "weightedAccuracy": 0.09523809523809523,
                "maxTeacherGap": 60000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.1111111111111111,
                "weightedPairwiseAccuracy": -0.09523809523809523
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 60000,
                "meanRegretInDiscs": 6,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 9,
                "correctPairs": 2,
                "tiedTeacherPairs": 6,
                "tiedPredictionPairs": 0,
                "accuracy": 0.2222222222222222,
                "weightedAccuracy": 0.19047619047619047,
                "maxTeacherGap": 60000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            }
          ]
        },
        {
          "key": "child-11-12",
          "minEmpties": 11,
          "maxEmpties": 12,
          "baseline": {
            "holdoutRoots": {
              "count": 1,
              "top1Accuracy": 1,
              "top3Accuracy": 1,
              "meanBestRank": 1,
              "meanRegret": 0,
              "meanRegretInDiscs": 0,
              "maxRegret": 0,
              "maxRegretInDiscs": 0
            },
            "pairwise": {
              "comparablePairs": 36,
              "correctPairs": 15,
              "tiedTeacherPairs": 19,
              "tiedPredictionPairs": 0,
              "accuracy": 0.4166666666666667,
              "weightedAccuracy": 0.4166666666666667,
              "maxTeacherGap": 40000
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 20000,
                "meanRegretInDiscs": 2,
                "maxRegret": 20000,
                "maxRegretInDiscs": 2
              },
              "pairwise": {
                "comparablePairs": 36,
                "correctPairs": 7,
                "tiedTeacherPairs": 19,
                "tiedPredictionPairs": 0,
                "accuracy": 0.19444444444444445,
                "weightedAccuracy": 0.1875,
                "maxTeacherGap": 40000
              },
              "deltas": {
                "top1Accuracy": -1,
                "top3Accuracy": 0,
                "meanRegret": 20000,
                "pairwiseAccuracy": -0.22222222222222224,
                "weightedPairwiseAccuracy": -0.22916666666666669
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 1,
                "top3Accuracy": 1,
                "meanBestRank": 1,
                "meanRegret": 0,
                "meanRegretInDiscs": 0,
                "maxRegret": 0,
                "maxRegretInDiscs": 0
              },
              "pairwise": {
                "comparablePairs": 36,
                "correctPairs": 11,
                "tiedTeacherPairs": 19,
                "tiedPredictionPairs": 0,
                "accuracy": 0.3055555555555556,
                "weightedAccuracy": 0.3125,
                "maxTeacherGap": 40000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.1111111111111111,
                "weightedPairwiseAccuracy": -0.10416666666666669
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 1,
                "top3Accuracy": 1,
                "meanBestRank": 1,
                "meanRegret": 0,
                "meanRegretInDiscs": 0,
                "maxRegret": 0,
                "maxRegretInDiscs": 0
              },
              "pairwise": {
                "comparablePairs": 36,
                "correctPairs": 21,
                "tiedTeacherPairs": 19,
                "tiedPredictionPairs": 0,
                "accuracy": 0.5833333333333334,
                "weightedAccuracy": 0.5833333333333334,
                "maxTeacherGap": 40000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0.16666666666666669,
                "weightedPairwiseAccuracy": 0.16666666666666669
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 1,
                "top3Accuracy": 1,
                "meanBestRank": 1,
                "meanRegret": 0,
                "meanRegretInDiscs": 0,
                "maxRegret": 0,
                "maxRegretInDiscs": 0
              },
              "pairwise": {
                "comparablePairs": 36,
                "correctPairs": 17,
                "tiedTeacherPairs": 19,
                "tiedPredictionPairs": 0,
                "accuracy": 0.4722222222222222,
                "weightedAccuracy": 0.4791666666666667,
                "maxTeacherGap": 40000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0.055555555555555525,
                "weightedPairwiseAccuracy": 0.0625
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 1,
                "top3Accuracy": 1,
                "meanBestRank": 1,
                "meanRegret": 0,
                "meanRegretInDiscs": 0,
                "maxRegret": 0,
                "maxRegretInDiscs": 0
              },
              "pairwise": {
                "comparablePairs": 36,
                "correctPairs": 15,
                "tiedTeacherPairs": 19,
                "tiedPredictionPairs": 0,
                "accuracy": 0.4166666666666667,
                "weightedAccuracy": 0.3958333333333333,
                "maxTeacherGap": 40000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": -0.02083333333333337
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 1,
                "top3Accuracy": 1,
                "meanBestRank": 1,
                "meanRegret": 0,
                "meanRegretInDiscs": 0,
                "maxRegret": 0,
                "maxRegretInDiscs": 0
              },
              "pairwise": {
                "comparablePairs": 36,
                "correctPairs": 15,
                "tiedTeacherPairs": 19,
                "tiedPredictionPairs": 0,
                "accuracy": 0.4166666666666667,
                "weightedAccuracy": 0.4166666666666667,
                "maxTeacherGap": 40000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 1,
                "top3Accuracy": 1,
                "meanBestRank": 1,
                "meanRegret": 0,
                "meanRegretInDiscs": 0,
                "maxRegret": 0,
                "maxRegretInDiscs": 0
              },
              "pairwise": {
                "comparablePairs": 36,
                "correctPairs": 15,
                "tiedTeacherPairs": 19,
                "tiedPredictionPairs": 0,
                "accuracy": 0.4166666666666667,
                "weightedAccuracy": 0.4166666666666667,
                "maxTeacherGap": 40000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            }
          ]
        },
        {
          "key": "child-13-14",
          "minEmpties": 13,
          "maxEmpties": 14,
          "baseline": {
            "holdoutRoots": {
              "count": 1,
              "top1Accuracy": 0,
              "top3Accuracy": 1,
              "meanBestRank": 2,
              "meanRegret": 100000,
              "meanRegretInDiscs": 10,
              "maxRegret": 100000,
              "maxRegretInDiscs": 10
            },
            "pairwise": {
              "comparablePairs": 6,
              "correctPairs": 0,
              "tiedTeacherPairs": 15,
              "tiedPredictionPairs": 0,
              "accuracy": 0,
              "weightedAccuracy": 0,
              "maxTeacherGap": 100000
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 1,
                "top3Accuracy": 1,
                "meanBestRank": 1,
                "meanRegret": 0,
                "meanRegretInDiscs": 0,
                "maxRegret": 0,
                "maxRegretInDiscs": 0
              },
              "pairwise": {
                "comparablePairs": 6,
                "correctPairs": 3,
                "tiedTeacherPairs": 15,
                "tiedPredictionPairs": 0,
                "accuracy": 0.5,
                "weightedAccuracy": 0.5,
                "maxTeacherGap": 100000
              },
              "deltas": {
                "top1Accuracy": 1,
                "top3Accuracy": 0,
                "meanRegret": -100000,
                "pairwiseAccuracy": 0.5,
                "weightedPairwiseAccuracy": 0.5
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 100000,
                "meanRegretInDiscs": 10,
                "maxRegret": 100000,
                "maxRegretInDiscs": 10
              },
              "pairwise": {
                "comparablePairs": 6,
                "correctPairs": 0,
                "tiedTeacherPairs": 15,
                "tiedPredictionPairs": 0,
                "accuracy": 0,
                "weightedAccuracy": 0,
                "maxTeacherGap": 100000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 100000,
                "meanRegretInDiscs": 10,
                "maxRegret": 100000,
                "maxRegretInDiscs": 10
              },
              "pairwise": {
                "comparablePairs": 6,
                "correctPairs": 0,
                "tiedTeacherPairs": 15,
                "tiedPredictionPairs": 0,
                "accuracy": 0,
                "weightedAccuracy": 0,
                "maxTeacherGap": 100000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 100000,
                "meanRegretInDiscs": 10,
                "maxRegret": 100000,
                "maxRegretInDiscs": 10
              },
              "pairwise": {
                "comparablePairs": 6,
                "correctPairs": 0,
                "tiedTeacherPairs": 15,
                "tiedPredictionPairs": 0,
                "accuracy": 0,
                "weightedAccuracy": 0,
                "maxTeacherGap": 100000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 100000,
                "meanRegretInDiscs": 10,
                "maxRegret": 100000,
                "maxRegretInDiscs": 10
              },
              "pairwise": {
                "comparablePairs": 6,
                "correctPairs": 0,
                "tiedTeacherPairs": 15,
                "tiedPredictionPairs": 0,
                "accuracy": 0,
                "weightedAccuracy": 0,
                "maxTeacherGap": 100000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 100000,
                "meanRegretInDiscs": 10,
                "maxRegret": 100000,
                "maxRegretInDiscs": 10
              },
              "pairwise": {
                "comparablePairs": 6,
                "correctPairs": 0,
                "tiedTeacherPairs": 15,
                "tiedPredictionPairs": 0,
                "accuracy": 0,
                "weightedAccuracy": 0,
                "maxTeacherGap": 100000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 1,
                "top1Accuracy": 0,
                "top3Accuracy": 1,
                "meanBestRank": 2,
                "meanRegret": 100000,
                "meanRegretInDiscs": 10,
                "maxRegret": 100000,
                "maxRegretInDiscs": 10
              },
              "pairwise": {
                "comparablePairs": 6,
                "correctPairs": 0,
                "tiedTeacherPairs": 15,
                "tiedPredictionPairs": 0,
                "accuracy": 0,
                "weightedAccuracy": 0,
                "maxTeacherGap": 100000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0
              }
            }
          ]
        }
      ]
    },
    "omittedFeatureResidualCorrelation": {
      "overall": [
        {
          "key": "opponentMoveCountRaw",
          "count": 24,
          "correlation": -0.25779302836853557,
          "meanAbsFeature": 7.375
        },
        {
          "key": "flipCount",
          "count": 24,
          "correlation": -0.16538800423902367,
          "meanAbsFeature": 4.083333333333333
        },
        {
          "key": "myMoveCountRaw",
          "count": 24,
          "correlation": 0.1356050854291024,
          "meanAbsFeature": 7.416666666666667
        },
        {
          "key": "opponentCornerReplies",
          "count": 24,
          "correlation": 0.058496821100833346,
          "meanAbsFeature": 1.125
        },
        {
          "key": "riskCSquare",
          "count": 24,
          "correlation": 0.031055813163017417,
          "meanAbsFeature": 0.2916666666666667
        },
        {
          "key": "riskXSquare",
          "count": 24,
          "correlation": -0.022048417687542687,
          "meanAbsFeature": 0.125
        },
        {
          "key": "passFlag",
          "count": 24,
          "correlation": null,
          "meanAbsFeature": 0
        }
      ],
      "byBucket": [
        {
          "key": "child-10-10",
          "minEmpties": 10,
          "maxEmpties": 10,
          "correlations": [
            {
              "key": "opponentCornerReplies",
              "count": 6,
              "correlation": -0.9750030692714279,
              "meanAbsFeature": 1.8333333333333333
            },
            {
              "key": "flipCount",
              "count": 6,
              "correlation": -0.6426382497399978,
              "meanAbsFeature": 2.5
            },
            {
              "key": "opponentMoveCountRaw",
              "count": 6,
              "correlation": -0.25962048442731467,
              "meanAbsFeature": 9.166666666666666
            },
            {
              "key": "myMoveCountRaw",
              "count": 6,
              "correlation": -0.2338289968314741,
              "meanAbsFeature": 5.166666666666667
            },
            {
              "key": "riskXSquare",
              "count": 6,
              "correlation": -0.22851249832394246,
              "meanAbsFeature": 0.16666666666666666
            },
            {
              "key": "passFlag",
              "count": 6,
              "correlation": null,
              "meanAbsFeature": 0
            },
            {
              "key": "riskCSquare",
              "count": 6,
              "correlation": null,
              "meanAbsFeature": 0
            }
          ]
        },
        {
          "key": "child-11-12",
          "minEmpties": 11,
          "maxEmpties": 12,
          "correlations": [
            {
              "key": "opponentMoveCountRaw",
              "count": 11,
              "correlation": -0.320100164420736,
              "meanAbsFeature": 4.636363636363637
            },
            {
              "key": "riskCSquare",
              "count": 11,
              "correlation": 0.28201605559062426,
              "meanAbsFeature": 0.36363636363636365
            },
            {
              "key": "flipCount",
              "count": 11,
              "correlation": -0.24450764429997865,
              "meanAbsFeature": 5.2727272727272725
            },
            {
              "key": "riskXSquare",
              "count": 11,
              "correlation": 0.2321961445298555,
              "meanAbsFeature": 0.09090909090909091
            },
            {
              "key": "opponentCornerReplies",
              "count": 11,
              "correlation": 0.223843195044021,
              "meanAbsFeature": 1
            },
            {
              "key": "myMoveCountRaw",
              "count": 11,
              "correlation": 0.05255927297609592,
              "meanAbsFeature": 9.545454545454545
            },
            {
              "key": "passFlag",
              "count": 11,
              "correlation": null,
              "meanAbsFeature": 0
            }
          ]
        },
        {
          "key": "child-13-14",
          "minEmpties": 13,
          "maxEmpties": 14,
          "correlations": [
            {
              "key": "opponentMoveCountRaw",
              "count": 7,
              "correlation": -0.6670982857308791,
              "meanAbsFeature": 10.142857142857142
            },
            {
              "key": "myMoveCountRaw",
              "count": 7,
              "correlation": 0.6109858946567707,
              "meanAbsFeature": 6
            },
            {
              "key": "riskCSquare",
              "count": 7,
              "correlation": -0.4113745362835965,
              "meanAbsFeature": 0.42857142857142855
            },
            {
              "key": "opponentCornerReplies",
              "count": 7,
              "correlation": 0.29548921319874843,
              "meanAbsFeature": 0.7142857142857143
            },
            {
              "key": "riskXSquare",
              "count": 7,
              "correlation": -0.22485002567819995,
              "meanAbsFeature": 0.14285714285714285
            },
            {
              "key": "flipCount",
              "count": 7,
              "correlation": 0.03119089523883904,
              "meanAbsFeature": 3.5714285714285716
            },
            {
              "key": "passFlag",
              "count": 7,
              "correlation": null,
              "meanAbsFeature": 0
            }
          ]
        }
      ]
    },
    "byBucket": [
      {
        "key": "child-10-10",
        "minEmpties": 10,
        "maxEmpties": 10,
        "holdoutMoves": {
          "targetMode": "root-mean",
          "count": 6,
          "mae": 61636.22998699427,
          "rmse": 71744.50266710464,
          "meanResidual": -16289.025889801545,
          "stdDevResidual": 69870.89020838047,
          "maxAbsResidual": 136041.6122915782,
          "maeInDiscs": 6.163622998699427,
          "rmseInDiscs": 7.174450266710464
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 6,
          "mae": 51829.18159212835,
          "rmse": 69870.89020838049,
          "meanResidual": -4.8506384094556175e-11,
          "stdDevResidual": 69870.89020838049,
          "maxAbsResidual": 152330.6381813797,
          "maeInDiscs": 5.182918159212835,
          "rmseInDiscs": 6.987089020838049
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
        },
        "holdoutPairwise": {
          "comparablePairs": 9,
          "correctPairs": 2,
          "tiedTeacherPairs": 6,
          "tiedPredictionPairs": 0,
          "accuracy": 0.2222222222222222,
          "weightedAccuracy": 0.19047619047619047,
          "maxTeacherGap": 60000
        }
      },
      {
        "key": "child-11-12",
        "minEmpties": 11,
        "maxEmpties": 12,
        "holdoutMoves": {
          "targetMode": "root-mean",
          "count": 11,
          "mae": 58966.18456990981,
          "rmse": 73435.61987427744,
          "meanResidual": -14008.640328972082,
          "stdDevResidual": 72087.08804253969,
          "maxAbsResidual": 143764.60875563702,
          "maeInDiscs": 5.896618456990981,
          "rmseInDiscs": 7.343561987427744
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 11,
          "mae": 55145.646298371954,
          "rmse": 72087.08804253968,
          "meanResidual": 0,
          "stdDevResidual": 72087.08804253968,
          "maxAbsResidual": 157773.2490846091,
          "maeInDiscs": 5.514564629837196,
          "rmseInDiscs": 7.208708804253967
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
        },
        "holdoutPairwise": {
          "comparablePairs": 36,
          "correctPairs": 15,
          "tiedTeacherPairs": 19,
          "tiedPredictionPairs": 0,
          "accuracy": 0.4166666666666667,
          "weightedAccuracy": 0.4166666666666667,
          "maxTeacherGap": 40000
        }
      },
      {
        "key": "child-13-14",
        "minEmpties": 13,
        "maxEmpties": 14,
        "holdoutMoves": {
          "targetMode": "root-mean",
          "count": 7,
          "mae": 59130.477658932956,
          "rmse": 60298.92542498643,
          "meanResidual": -39790.98164040448,
          "stdDevResidual": 45306.05023063772,
          "maxAbsResidual": 74677.44329193242,
          "maeInDiscs": 5.913047765893295,
          "rmseInDiscs": 6.029892542498644
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 7,
          "mae": 30708.347915786908,
          "rmse": 45306.050230637724,
          "meanResidual": -1.039422516311918e-11,
          "stdDevResidual": 45306.050230637724,
          "maxAbsResidual": 107479.21770525414,
          "maeInDiscs": 3.0708347915786907,
          "rmseInDiscs": 4.530605023063773
        },
        "holdoutRoots": {
          "count": 1,
          "top1Accuracy": 0,
          "top3Accuracy": 1,
          "meanBestRank": 2,
          "meanRegret": 100000,
          "meanRegretInDiscs": 10,
          "maxRegret": 100000,
          "maxRegretInDiscs": 10
        },
        "holdoutPairwise": {
          "comparablePairs": 6,
          "correctPairs": 0,
          "tiedTeacherPairs": 15,
          "tiedPredictionPairs": 0,
          "accuracy": 0,
          "weightedAccuracy": 0,
          "maxTeacherGap": 100000
        }
      }
    ],
    "teacherConfig": {
      "exactRootMaxEmpties": 14,
      "exactRootTimeLimitMs": 60000,
      "teacherDepth": 4,
      "teacherTimeLimitMs": 1000,
      "teacherExactEndgameEmpties": 14
    },
    "sampling": {
      "sampleStride": 1,
      "sampleResidue": 0,
      "maxRootsPerBucket": 2,
      "holdoutMod": 2,
      "holdoutResidue": 0,
      "targetMode": "root-mean",
      "rootWeighting": "uniform",
      "exactRootWeightScale": 1,
      "excludedFeatureKeys": []
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
    "createdAt": "2026-03-27T17:33:34.989Z"
  },
  "trainedBuckets": [
    {
      "key": "child-10-10",
      "minEmpties": 10,
      "maxEmpties": 10,
      "weights": {
        "mobility": 450.464555,
        "corners": 2424.894585,
        "cornerAdjacency": 560.512849,
        "edgePattern": 850.434282,
        "cornerPattern": 1141.200971,
        "discDifferential": 195.340848,
        "parity": -123.468441
      }
    },
    {
      "key": "child-11-12",
      "minEmpties": 11,
      "maxEmpties": 12,
      "weights": {
        "mobility": 3987.669174,
        "corners": 2145.544032,
        "cornerAdjacency": -3357.520864,
        "edgePattern": -3334.22525,
        "cornerPattern": 953.242622,
        "discDifferential": -323.250373,
        "parity": 2145.544032
      }
    },
    {
      "key": "child-13-14",
      "minEmpties": 13,
      "maxEmpties": 14,
      "weights": {
        "mobility": 1881.188825,
        "corners": -282.972905,
        "cornerAdjacency": -42.810584,
        "edgePattern": 907.824528,
        "cornerPattern": -49.667187,
        "discDifferential": 27.209082,
        "parity": 0
      }
    }
  ]
});

export { GENERATED_EVALUATION_PROFILE, GENERATED_MOVE_ORDERING_PROFILE };
export default GENERATED_EVALUATION_PROFILE;
