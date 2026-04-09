const GENERATED_EVALUATION_PROFILE = Object.freeze({
  "version": 1,
  "name": "trained-phase-linear-v1",
  "description": "회귀 기반으로 재추정한 phase-bucket linear evaluator입니다.",
  "source": {
    "inputFiles": [
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000000.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000001.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000002.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000003.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000004.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000005.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000006.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000007.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000008.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000009.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000010.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000011.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000012.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000013.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000014.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000015.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000016.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000017.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000018.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000019.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000020.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000021.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000022.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000023.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000024.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000025.txt"
    ],
    "targetScale": 3000,
    "holdoutMod": 10,
    "holdoutResidue": 0,
    "regularization": 5000,
    "seenSamples": 25514097,
    "skipDiagnostics": false,
    "keepParityAliases": false,
    "globalExcludedFeatures": [],
    "bucketExcludedFeatures": [
      {
        "key": "opening-a",
        "minEmpties": 52,
        "maxEmpties": 60,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ]
      },
      {
        "key": "opening-b",
        "minEmpties": 44,
        "maxEmpties": 51,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ]
      },
      {
        "key": "midgame-a",
        "minEmpties": 36,
        "maxEmpties": 43,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ]
      },
      {
        "key": "midgame-b",
        "minEmpties": 28,
        "maxEmpties": 35,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ]
      },
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ]
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "excludedFeatures": []
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "excludedFeatures": []
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "excludedFeatures": []
      }
    ]
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
    "excludedFeatureSummaryByBucket": [
      {
        "key": "opening-a",
        "minEmpties": 52,
        "maxEmpties": 60,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ],
        "activeFeatureCount": 18
      },
      {
        "key": "opening-b",
        "minEmpties": 44,
        "maxEmpties": 51,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ],
        "activeFeatureCount": 18
      },
      {
        "key": "midgame-a",
        "minEmpties": 36,
        "maxEmpties": 43,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ],
        "activeFeatureCount": 18
      },
      {
        "key": "midgame-b",
        "minEmpties": 28,
        "maxEmpties": 35,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ],
        "activeFeatureCount": 18
      },
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "excludedFeatures": [
          "parityGlobal",
          "parityRegion"
        ],
        "activeFeatureCount": 18
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "excludedFeatures": [],
        "activeFeatureCount": 20
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "excludedFeatures": [],
        "activeFeatureCount": 20
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "excludedFeatures": [],
        "activeFeatureCount": 20
      }
    ],
    "all": {
      "count": 25514097,
      "mae": 18651.49042884018,
      "rmse": 24372.89129135579,
      "meanResidual": 10.341334753097474,
      "stdDevResidual": 24372.889097459134,
      "maxAbsResidual": 419087,
      "maeInStones": 6.21716347628006,
      "rmseInStones": 8.124297097118596,
      "meanResidualInStones": 0.0034471115843658245,
      "stdDevResidualInStones": 8.124296365819712,
      "maxAbsResidualInStones": 139.69566666666665
    },
    "holdout": {
      "count": 2551410,
      "mae": 18663.84956592629,
      "rmse": 24390.47237279828,
      "meanResidual": 2.3827001540324764,
      "stdDevResidual": 24390.472256415535,
      "maxAbsResidual": 355000,
      "maeInStones": 6.221283188642097,
      "rmseInStones": 8.130157457599426,
      "meanResidualInStones": 0.0007942333846774921,
      "stdDevResidualInStones": 8.130157418805178,
      "maxAbsResidualInStones": 118.33333333333333
    },
    "byBucket": [
      {
        "key": "opening-a",
        "minEmpties": 52,
        "maxEmpties": 60,
        "trainCount": 72107,
        "holdoutCount": 7961,
        "mpcResidualMean": 104.35472930536365,
        "mpcResidualStdDev": 15625.903433315581,
        "holdout": {
          "count": 7961,
          "mae": 11200.211279989951,
          "rmse": 15626.251886387601,
          "meanResidual": 104.35472930536365,
          "stdDevResidual": 15625.903433315581,
          "maxAbsResidual": 275783,
          "maeInStones": 3.7334037599966505,
          "rmseInStones": 5.208750628795867
        },
        "all": {
          "count": 80068,
          "mae": 11344.958909926563,
          "rmse": 15995.568084034048,
          "meanResidual": 119.03164809911576,
          "stdDevResidual": 15995.125188560403,
          "maxAbsResidual": 294115,
          "maeInStones": 3.781652969975521,
          "rmseInStones": 5.33185602801135
        }
      },
      {
        "key": "opening-b",
        "minEmpties": 44,
        "maxEmpties": 51,
        "trainCount": 3540649,
        "holdoutCount": 393380,
        "mpcResidualMean": -31.626544308302403,
        "mpcResidualStdDev": 20421.554909114362,
        "holdout": {
          "count": 393380,
          "mae": 14916.068986730388,
          "rmse": 20421.579398868194,
          "meanResidual": -31.626544308302403,
          "stdDevResidual": 20421.554909114362,
          "maxAbsResidual": 346296,
          "maeInStones": 4.972022995576796,
          "rmseInStones": 6.807193132956065
        },
        "all": {
          "count": 3934029,
          "mae": 14917.697808785853,
          "rmse": 20446.57169599231,
          "meanResidual": 5.696802692608519,
          "stdDevResidual": 20446.57090237365,
          "maxAbsResidual": 419087,
          "maeInStones": 4.972565936261951,
          "rmseInStones": 6.815523898664103
        }
      },
      {
        "key": "midgame-a",
        "minEmpties": 36,
        "maxEmpties": 43,
        "trainCount": 3600056,
        "holdoutCount": 399944,
        "mpcResidualMean": 53.76027143800132,
        "mpcResidualStdDev": 22130.277528513776,
        "holdout": {
          "count": 399944,
          "mae": 16528.474211389595,
          "rmse": 22130.342827345146,
          "meanResidual": 53.76027143800132,
          "stdDevResidual": 22130.277528513776,
          "maxAbsResidual": 355000,
          "maeInStones": 5.509491403796532,
          "rmseInStones": 7.376780942448383
        },
        "all": {
          "count": 4000000,
          "mae": 16489.854699,
          "rmse": 22050.01006908524,
          "meanResidual": 18.6511665,
          "stdDevResidual": 22050.00218096925,
          "maxAbsResidual": 403285,
          "maeInStones": 5.4966182329999995,
          "rmseInStones": 7.350003356361747
        }
      },
      {
        "key": "midgame-b",
        "minEmpties": 28,
        "maxEmpties": 35,
        "trainCount": 3600089,
        "holdoutCount": 399911,
        "mpcResidualMean": 37.98888502691849,
        "mpcResidualStdDev": 25047.307290440935,
        "holdout": {
          "count": 399911,
          "mae": 19052.9863469622,
          "rmse": 25047.33609901782,
          "meanResidual": 37.98888502691849,
          "stdDevResidual": 25047.307290440935,
          "maxAbsResidual": 253552,
          "maeInStones": 6.350995448987399,
          "rmseInStones": 8.34911203300594
        },
        "all": {
          "count": 4000000,
          "mae": 19067.03909775,
          "rmse": 25041.51823445566,
          "meanResidual": 16.15598675,
          "stdDevResidual": 25041.51302279212,
          "maxAbsResidual": 253552,
          "maeInStones": 6.3556796992499995,
          "rmseInStones": 8.347172744818554
        }
      },
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "trainCount": 3599593,
        "holdoutCount": 400407,
        "mpcResidualMean": 12.251209394441156,
        "mpcResidualStdDev": 26817.787844900537,
        "holdout": {
          "count": 400407,
          "mae": 20927.38468608191,
          "rmse": 26817.790643269378,
          "meanResidual": 12.251209394441156,
          "stdDevResidual": 26817.787844900537,
          "maxAbsResidual": 212675,
          "maeInStones": 6.975794895360637,
          "rmseInStones": 8.93926354775646
        },
        "all": {
          "count": 4000000,
          "mae": 20937.25665425,
          "rmse": 26844.49929718129,
          "meanResidual": 11.54319625,
          "stdDevResidual": 26844.496815380746,
          "maxAbsResidual": 233660,
          "maeInStones": 6.9790855514166665,
          "rmseInStones": 8.948166432393764
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
    "createdAt": "2026-03-28T06:29:09.919Z"
  },
  "featureKeys": [
    "mobility",
    "potentialMobility",
    "corners",
    "cornerAccess",
    "cornerMoveBalance",
    "cornerAdjacency",
    "cornerOrthAdjacency",
    "cornerDiagonalAdjacency",
    "frontier",
    "positional",
    "edgePattern",
    "cornerPattern",
    "stability",
    "stableDiscDifferential",
    "discDifferential",
    "discDifferentialRaw",
    "parity",
    "parityGlobal",
    "parityRegion"
  ],
  "phaseBuckets": [
    {
      "key": "opening-a",
      "minEmpties": 52,
      "maxEmpties": 60,
      "weights": {
        "bias": -1739.970763,
        "mobility": 253.50357,
        "potentialMobility": 486.698783,
        "corners": 244.088907,
        "cornerAccess": -1.22501,
        "cornerMoveBalance": -7.361699,
        "cornerAdjacency": 17.796626,
        "cornerOrthAdjacency": 32.902561,
        "cornerDiagonalAdjacency": 237.896852,
        "frontier": 273.873192,
        "positional": 383.281001,
        "edgePattern": 883.572215,
        "cornerPattern": 3327.041732,
        "stability": -460.911093,
        "stableDiscDifferential": 137.500279,
        "discDifferential": 67.605069,
        "discDifferentialRaw": -1329.972723,
        "parity": 48.911905,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "opening-b",
      "minEmpties": 44,
      "maxEmpties": 51,
      "weights": {
        "bias": -6970.527084,
        "mobility": 342.750349,
        "potentialMobility": 546.905066,
        "corners": 21.444108,
        "cornerAccess": 28.34277,
        "cornerMoveBalance": -2140.140015,
        "cornerAdjacency": 34.996655,
        "cornerOrthAdjacency": 127.39043,
        "cornerDiagonalAdjacency": 239.630336,
        "frontier": 688.707998,
        "positional": 341.053585,
        "edgePattern": -1248.263101,
        "cornerPattern": 2273.279516,
        "stability": 113.340613,
        "stableDiscDifferential": 13065.188336,
        "discDifferential": 544.750823,
        "discDifferentialRaw": -3576.35819,
        "parity": 55.255791,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "midgame-a",
      "minEmpties": 36,
      "maxEmpties": 43,
      "weights": {
        "bias": -10620.59312,
        "mobility": 386.914734,
        "potentialMobility": 473.60683,
        "corners": 197.025032,
        "cornerAccess": 34.835398,
        "cornerMoveBalance": 3770.351265,
        "cornerAdjacency": 38.122815,
        "cornerOrthAdjacency": 120.979005,
        "cornerDiagonalAdjacency": 205.519344,
        "frontier": 891.223071,
        "positional": 241.619925,
        "edgePattern": -1267.978715,
        "cornerPattern": 1131.273716,
        "stability": 86.117868,
        "stableDiscDifferential": 11368.425158,
        "discDifferential": 322.054831,
        "discDifferentialRaw": -2281.349562,
        "parity": 53.295666,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "midgame-b",
      "minEmpties": 28,
      "maxEmpties": 35,
      "weights": {
        "bias": -9886.319403,
        "mobility": 440.324455,
        "potentialMobility": 280.93806,
        "corners": 118.912255,
        "cornerAccess": 80.214499,
        "cornerMoveBalance": 6596.880526,
        "cornerAdjacency": -0.670305,
        "cornerOrthAdjacency": 71.60991,
        "cornerDiagonalAdjacency": 90.883635,
        "frontier": 969.574147,
        "positional": 163.329483,
        "edgePattern": -661.559118,
        "cornerPattern": 922.626759,
        "stability": 87.292518,
        "stableDiscDifferential": 7320.04035,
        "discDifferential": -262.012503,
        "discDifferentialRaw": -71.453156,
        "parity": 53.256162,
        "parityGlobal": 0,
        "parityRegion": 0
      }
    },
    {
      "key": "midgame-c",
      "minEmpties": 20,
      "maxEmpties": 27,
      "weights": {
        "bias": -8253.301721,
        "mobility": 576.683718,
        "potentialMobility": -22.143095,
        "corners": 101.94498,
        "cornerAccess": 31.203645,
        "cornerMoveBalance": 9337.338511,
        "cornerAdjacency": -31.308693,
        "cornerOrthAdjacency": 54.941931,
        "cornerDiagonalAdjacency": 30.469095,
        "frontier": 821.537569,
        "positional": 89.796401,
        "edgePattern": -266.349837,
        "cornerPattern": 759.96795,
        "stability": 62.475848,
        "stableDiscDifferential": 4139.506131,
        "discDifferential": -731.568976,
        "discDifferentialRaw": 978.002909,
        "parity": 55.536395,
        "parityGlobal": 0,
        "parityRegion": 0
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
  "name": "stage44-candidateH2-edgePattern125-cornerPattern125-11-12",
  "description": "Search-cost top-pair follow-up on candidateF: scale child empties 11-12 edgePattern and cornerPattern by 1.25.",
  "stage": {
    "number": 38,
    "tag": "stage38",
    "file": "stage-info.json",
    "label": "Stage 38",
    "updatedAt": "2026-03-30T16:54:58+09:00",
    "kind": "move-ordering-profile",
    "status": "active-adopted-candidateH2",
    "adoptedFrom": "tools/evaluator-training/out/stage44_candidateH2_edgePattern125_cornerPattern125_11_12.json"
  },
  "source": {
    "inputFiles": [
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000000.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000001.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000002.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000003.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000004.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000005.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000006.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000007.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000008.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000009.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000010.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000011.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000012.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000013.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000014.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000015.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000016.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000017.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000018.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000019.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000020.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000021.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000022.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000023.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000024.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000025.txt"
    ],
    "teacherEvaluationProfileName": "trained-phase-linear-v1",
    "teacherEvaluationProfilePath": null,
    "teacherMoveOrderingProfileName": null,
    "teacherMoveOrderingProfilePath": null,
    "regularization": 5000,
    "scannedSamples": 8539654,
    "eligibleRoots": 499801,
    "acceptedRoots": 2500,
    "targetMode": "root-mean",
    "rootWeighting": "uniform",
    "exactRootWeightScale": 1,
    "excludedFeatureKeys": [],
    "derivedFromProfileName": "stage41-candidateF-cornerPattern125-11-12",
    "derivedFromProfilePath": "tools/evaluator-training/out/stage41_candidateF_cornerPattern125_11_12.json",
    "derivedAt": "2026-03-30T05:08:10.351Z",
    "tuning": {
      "type": "search-cost-top-pair",
      "actionChain": [
        {
          "type": "scale",
          "featureKey": "edgePattern",
          "range": {
            "key": "11-12",
            "minEmpties": 11,
            "maxEmpties": 12
          },
          "scale": 1.25
        },
        {
          "type": "scale",
          "featureKey": "cornerPattern",
          "range": {
            "key": "11-12",
            "minEmpties": 11,
            "maxEmpties": 12
          },
          "scale": 1.25
        }
      ]
    },
    "adoptedAt": "2026-03-30T16:54:58+09:00",
    "baselineProfileBackupPath": "tools/evaluator-training/out/stage38_baseline_trained_move_ordering_linear_v2.json",
    "candidateAlias": "candidateH2",
    "candidateAliasAssignedAt": "2026-03-30T00:00:00Z",
    "priorActiveProfileName": "stage41-candidateF-cornerPattern125-11-12",
    "priorActiveProfileBackupPath": "tools/evaluator-training/out/stage44_candidateF_before_candidateH2.json",
    "adoptedFromProfilePath": "tools/evaluator-training/out/stage44_candidateH2_edgePattern125_cornerPattern125_11_12.json",
    "selectedFromTuningSummaryPath": "benchmarks/stage43_top_pair_search_decision_summary_20260330.json",
    "selectedFromSmallValidationPath": "benchmarks/stage43_candidateH2_vs_candidateF_seed1_4_fullsuite_validation_20260330.json",
    "selectedFromBenchmarkSummaryPath": "benchmarks/stage44_candidateH2_current_apples_to_apples_24seed_20260330.json"
  },
  "diagnostics": {
    "bucketCounts": [
      {
        "key": "child-10-10",
        "minEmpties": 10,
        "maxEmpties": 10,
        "trainRootCount": 455,
        "holdoutRootCount": 45,
        "trainMoveCount": 2910,
        "holdoutMoveCount": 285,
        "exactRootCount": 500,
        "depthRootCount": 0,
        "rootWeightSum": 500
      },
      {
        "key": "child-11-12",
        "minEmpties": 11,
        "maxEmpties": 12,
        "trainRootCount": 450,
        "holdoutRootCount": 50,
        "trainMoveCount": 3214,
        "holdoutMoveCount": 377,
        "exactRootCount": 500,
        "depthRootCount": 0,
        "rootWeightSum": 500
      },
      {
        "key": "child-13-14",
        "minEmpties": 13,
        "maxEmpties": 14,
        "trainRootCount": 451,
        "holdoutRootCount": 49,
        "trainMoveCount": 3590,
        "holdoutMoveCount": 418,
        "exactRootCount": 248,
        "depthRootCount": 252,
        "rootWeightSum": 500
      },
      {
        "key": "child-15-16",
        "minEmpties": 15,
        "maxEmpties": 16,
        "trainRootCount": 448,
        "holdoutRootCount": 52,
        "trainMoveCount": 3803,
        "holdoutMoveCount": 451,
        "exactRootCount": 0,
        "depthRootCount": 500,
        "rootWeightSum": 500
      },
      {
        "key": "child-17-18",
        "minEmpties": 17,
        "maxEmpties": 18,
        "trainRootCount": 446,
        "holdoutRootCount": 54,
        "trainMoveCount": 4130,
        "holdoutMoveCount": 500,
        "exactRootCount": 0,
        "depthRootCount": 500,
        "rootWeightSum": 500
      }
    ],
    "holdoutMoves": {
      "targetMode": "root-mean",
      "count": 2031,
      "mae": 13879.114784834177,
      "rmse": 28593.034082054575,
      "meanResidual": -20.856251053170038,
      "stdDevResidual": 28593.02647559937,
      "maxAbsResidual": 381621.4263288247,
      "maeInDiscs": 1.3879114784834177,
      "rmseInDiscs": 2.8593034082054576
    },
    "holdoutMovesRawAligned": {
      "alignment": "per-root-mean",
      "count": 2031,
      "mae": 13625.273233211848,
      "rmse": 28471.936171617304,
      "meanResidual": -2.221119508022513e-13,
      "stdDevResidual": 28471.936171617304,
      "maxAbsResidual": 378412.43692501046,
      "maeInDiscs": 1.3625273233211848,
      "rmseInDiscs": 2.8471936171617305
    },
    "holdoutRoots": {
      "count": 250,
      "top1Accuracy": 0.48,
      "top3Accuracy": 0.816,
      "meanBestRank": 2.336,
      "meanRegret": 9883.708,
      "meanRegretInDiscs": 0.9883708000000001,
      "maxRegret": 160000,
      "maxRegretInDiscs": 16
    },
    "holdoutPairwise": {
      "comparablePairs": 6430,
      "correctPairs": 3787,
      "tiedTeacherPairs": 1652,
      "tiedPredictionPairs": 9,
      "accuracy": 0.5889580093312597,
      "weightedAccuracy": 0.6249619325261336,
      "maxTeacherGap": 480000
    },
    "featureContribution": {
      "overall": [
        {
          "key": "mobility",
          "count": 2031,
          "meanContribution": 21.550041356641902,
          "meanAbsContribution": 1098.7110456779553,
          "maxAbsContribution": 7322.504679165473,
          "absContributionShare": 0.15602923013161824
        },
        {
          "key": "corners",
          "count": 2031,
          "meanContribution": -35.402237867934936,
          "meanAbsContribution": 384.47471631478555,
          "maxAbsContribution": 1783.217855263644,
          "absContributionShare": 0.05459970046505918
        },
        {
          "key": "cornerAdjacency",
          "count": 2031,
          "meanContribution": -199.25739957425478,
          "meanAbsContribution": 800.8873639365478,
          "maxAbsContribution": 3519.1054660911204,
          "absContributionShare": 0.11373494360389678
        },
        {
          "key": "edgePattern",
          "count": 2031,
          "meanContribution": 106.13593598136845,
          "meanAbsContribution": 1831.4825533152232,
          "maxAbsContribution": 22160.09914381725,
          "absContributionShare": 0.26009096196619624
        },
        {
          "key": "cornerPattern",
          "count": 2031,
          "meanContribution": -77.28743426330401,
          "meanAbsContribution": 2611.803763270944,
          "maxAbsContribution": 21574.705268554717,
          "absContributionShare": 0.37090528218597413
        },
        {
          "key": "discDifferential",
          "count": 2031,
          "meanContribution": 39.4840335612934,
          "meanAbsContribution": 153.67296834059658,
          "maxAbsContribution": 1013.700711447192,
          "absContributionShare": 0.02182327649889842
        },
        {
          "key": "parity",
          "count": 2031,
          "meanContribution": 123.92080975301975,
          "meanAbsContribution": 160.66769079245813,
          "maxAbsContribution": 845.802204118919,
          "absContributionShare": 0.022816605148356817
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
              "count": 285,
              "meanContribution": -162.42816887515662,
              "meanAbsContribution": 1209.5361224494475,
              "maxAbsContribution": 4854.6130759300395,
              "absContributionShare": 0.11916305480909033
            },
            {
              "key": "corners",
              "count": 285,
              "meanContribution": -381.67119007397343,
              "meanAbsContribution": 1076.1876179134954,
              "maxAbsContribution": 1783.217855263644,
              "absContributionShare": 0.106025609089364
            },
            {
              "key": "cornerAdjacency",
              "count": 285,
              "meanContribution": -1152.8262015668909,
              "meanAbsContribution": 2150.5234705499165,
              "maxAbsContribution": 3519.1054660911204,
              "absContributionShare": 0.21186878294334313
            },
            {
              "key": "edgePattern",
              "count": 285,
              "meanContribution": 1249.2394975112354,
              "meanAbsContribution": 2623.373278672964,
              "maxAbsContribution": 6637.048363350768,
              "absContributionShare": 0.258453772474476
            },
            {
              "key": "cornerPattern",
              "count": 285,
              "meanContribution": -1059.8880001035486,
              "meanAbsContribution": 1958.3938767345398,
              "maxAbsContribution": 4972.314074559856,
              "absContributionShare": 0.19294024588410627
            },
            {
              "key": "discDifferential",
              "count": 285,
              "meanContribution": 85.8385163845341,
              "meanAbsContribution": 286.44455191303155,
              "maxAbsContribution": 1013.700711447192,
              "absContributionShare": 0.028220412111589925
            },
            {
              "key": "parity",
              "count": 285,
              "meanContribution": 845.8022041189232,
              "meanAbsContribution": 845.8022041189232,
              "maxAbsContribution": 845.802204118919,
              "absContributionShare": 0.08332812268803085
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
              "count": 377,
              "meanContribution": 84.21835981854359,
              "meanAbsContribution": 1667.1188273357484,
              "maxAbsContribution": 7322.504679165473,
              "absContributionShare": 0.10563178884902039
            },
            {
              "key": "corners",
              "count": 377,
              "meanContribution": 74.8236740312422,
              "meanAbsContribution": 332.171765017483,
              "maxAbsContribution": 641.1028434040527,
              "absContributionShare": 0.021047028663222382
            },
            {
              "key": "cornerAdjacency",
              "count": 377,
              "meanContribution": 52.316824481626874,
              "meanAbsContribution": 1635.341371361472,
              "maxAbsContribution": 2809.3531500409676,
              "absContributionShare": 0.10361830938697254
            },
            {
              "key": "edgePattern",
              "count": 377,
              "meanContribution": -474.13355274596256,
              "meanAbsContribution": 5128.272104987938,
              "maxAbsContribution": 22160.09914381725,
              "absContributionShare": 0.3249369794594193
            },
            {
              "key": "cornerPattern",
              "count": 377,
              "meanContribution": 122.29403080900084,
              "meanAbsContribution": 6754.393393912555,
              "maxAbsContribution": 21574.705268554717,
              "absContributionShare": 0.4279710870575506
            },
            {
              "key": "discDifferential",
              "count": 377,
              "meanContribution": 9.89716961769297,
              "meanAbsContribution": 38.90131938265248,
              "maxAbsContribution": 162.6871937307679,
              "absContributionShare": 0.0024648608651032153
            },
            {
              "key": "parity",
              "count": 377,
              "meanContribution": 28.19505685541111,
              "meanAbsContribution": 226.1603496699984,
              "maxAbsContribution": 226.16034966999993,
              "absContributionShare": 0.014329945718710687
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
              "count": 418,
              "meanContribution": 264.89345995601553,
              "meanAbsContribution": 1585.0756583930824,
              "maxAbsContribution": 4659.840642338935,
              "absContributionShare": 0.41619942677134586
            },
            {
              "key": "corners",
              "count": 418,
              "meanContribution": 21.426657328009128,
              "meanAbsContribution": 559.3096412863083,
              "maxAbsContribution": 926.5182168732226,
              "absContributionShare": 0.14686008889130295
            },
            {
              "key": "cornerAdjacency",
              "count": 418,
              "meanContribution": -229.26254066217606,
              "meanAbsContribution": 661.3429883136523,
              "maxAbsContribution": 1259.300150346297,
              "absContributionShare": 0.17365137820262436
            },
            {
              "key": "edgePattern",
              "count": 418,
              "meanContribution": -11.782329151069986,
              "meanAbsContribution": 84.21494938001437,
              "maxAbsContribution": 290.24442009916504,
              "absContributionShare": 0.022112643943490426
            },
            {
              "key": "cornerPattern",
              "count": 418,
              "meanContribution": 108.8948264894791,
              "meanAbsContribution": 632.8525423519005,
              "maxAbsContribution": 1859.1029797769036,
              "absContributionShare": 0.1661705319635482
            },
            {
              "key": "discDifferential",
              "count": 418,
              "meanContribution": 55.03741608491537,
              "meanAbsContribution": 285.65650645250895,
              "maxAbsContribution": 982.2785008559255,
              "absContributionShare": 0.07500593022768884
            },
            {
              "key": "parity",
              "count": 418,
              "meanContribution": 0,
              "meanAbsContribution": 0,
              "maxAbsContribution": 0,
              "absContributionShare": 0
            }
          ]
        },
        {
          "key": "child-15-16",
          "minEmpties": 15,
          "maxEmpties": 16,
          "features": [
            {
              "key": "mobility",
              "count": 451,
              "meanContribution": 11.273303610590116,
              "meanAbsContribution": 701.4631190205507,
              "maxAbsContribution": 3029.498225686022,
              "absContributionShare": 0.18044067987322268
            },
            {
              "key": "corners",
              "count": 451,
              "meanContribution": -7.211722811977398,
              "meanAbsContribution": 202.9180830428935,
              "maxAbsContribution": 382.64552802374305,
              "absContributionShare": 0.052197579416513935
            },
            {
              "key": "cornerAdjacency",
              "count": 451,
              "meanContribution": -1.9745718787791098,
              "meanAbsContribution": 79.77959717156716,
              "maxAbsContribution": 141.92641232418634,
              "absContributionShare": 0.02052208357546973
            },
            {
              "key": "edgePattern",
              "count": 451,
              "meanContribution": -53.149603173351004,
              "meanAbsContribution": 814.5456748627863,
              "maxAbsContribution": 3676.9692097011184,
              "absContributionShare": 0.2095294412131854
            },
            {
              "key": "cornerPattern",
              "count": 451,
              "meanContribution": 171.53596931050836,
              "meanAbsContribution": 1968.1904868734098,
              "maxAbsContribution": 6052.185747135726,
              "absContributionShare": 0.5062869592735391
            },
            {
              "key": "discDifferential",
              "count": 451,
              "meanContribution": 38.65209301316614,
              "meanAbsContribution": 120.60290609534222,
              "maxAbsContribution": 514.1635759296341,
              "absContributionShare": 0.031023256648069666
            },
            {
              "key": "parity",
              "count": 451,
              "meanContribution": 0,
              "meanAbsContribution": 0,
              "maxAbsContribution": 0,
              "absContributionShare": 0
            }
          ]
        },
        {
          "key": "child-17-18",
          "minEmpties": 17,
          "maxEmpties": 18,
          "features": [
            {
              "key": "mobility",
              "count": 500,
              "meanContribution": -114.99977143364445,
              "meanAbsContribution": 558.6780981633609,
              "maxAbsContribution": 2059.9470642284823,
              "absContributionShare": 0.1321549559792695
            },
            {
              "key": "corners",
              "count": 500,
              "meanContribution": 5.923926353244511,
              "meanAbsContribution": 47.23687361674088,
              "maxAbsContribution": 77.2686046075371,
              "absContributionShare": 0.0111738530182963
            },
            {
              "key": "cornerAdjacency",
              "count": 500,
              "meanContribution": 1.7250399915959795,
              "meanAbsContribution": 169.51476521128734,
              "maxAbsContribution": 292.3796595925388,
              "absContributionShare": 0.04009861207729559
            },
            {
              "key": "edgePattern",
              "count": 500,
              "meanContribution": 134.3453263780273,
              "meanAbsContribution": 1272.3182991540157,
              "maxAbsContribution": 8810.293783985822,
              "absContributionShare": 0.3009661008174189
            },
            {
              "key": "cornerPattern",
              "count": 500,
              "meanContribution": -47.77661641178792,
              "meanAbsContribution": 2095.6772130918175,
              "maxAbsContribution": 7073.72233281323,
              "absContributionShare": 0.4957311388318004
            },
            {
              "key": "discDifferential",
              "count": 500,
              "meanContribution": 23.118256350183753,
              "meanAbsContribution": 84.02194730225929,
              "maxAbsContribution": 311.617923985083,
              "absContributionShare": 0.01987533927592007
            },
            {
              "key": "parity",
              "count": 500,
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
            "count": 250,
            "top1Accuracy": 0.48,
            "top3Accuracy": 0.816,
            "meanBestRank": 2.336,
            "meanRegret": 9883.708,
            "meanRegretInDiscs": 0.9883708000000001,
            "maxRegret": 160000,
            "maxRegretInDiscs": 16
          },
          "pairwise": {
            "comparablePairs": 6430,
            "correctPairs": 3787,
            "tiedTeacherPairs": 1652,
            "tiedPredictionPairs": 9,
            "accuracy": 0.5889580093312597,
            "weightedAccuracy": 0.6249619325261336,
            "maxTeacherGap": 480000
          }
        },
        "byFeature": [
          {
            "key": "mobility",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.432,
              "top3Accuracy": 0.736,
              "meanBestRank": 2.896,
              "meanRegret": 11913.628,
              "meanRegretInDiscs": 1.1913628,
              "maxRegret": 180000,
              "maxRegretInDiscs": 18
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3450,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 52,
              "accuracy": 0.536547433903577,
              "weightedAccuracy": 0.5349580487618721,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": -0.04799999999999999,
              "top3Accuracy": -0.07999999999999996,
              "meanRegret": 2029.92,
              "pairwiseAccuracy": -0.05241057542768279,
              "weightedPairwiseAccuracy": -0.0900038837642615
            }
          },
          {
            "key": "corners",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.468,
              "top3Accuracy": 0.816,
              "meanBestRank": 2.368,
              "meanRegret": 11269.648,
              "meanRegretInDiscs": 1.1269647999999999,
              "maxRegret": 200000,
              "maxRegretInDiscs": 20
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3785,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 9,
              "accuracy": 0.588646967340591,
              "weightedAccuracy": 0.6240489844177116,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": -0.011999999999999955,
              "top3Accuracy": 0,
              "meanRegret": 1385.9399999999987,
              "pairwiseAccuracy": -0.00031104199066878113,
              "weightedPairwiseAccuracy": -0.0009129481084220181
            }
          },
          {
            "key": "cornerAdjacency",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.464,
              "top3Accuracy": 0.788,
              "meanBestRank": 2.372,
              "meanRegret": 10950.024,
              "meanRegretInDiscs": 1.0950024,
              "maxRegret": 160000,
              "maxRegretInDiscs": 16
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3743,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 9,
              "accuracy": 0.5821150855365474,
              "weightedAccuracy": 0.6106047659227586,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": -0.01599999999999996,
              "top3Accuracy": -0.027999999999999914,
              "meanRegret": 1066.315999999999,
              "pairwiseAccuracy": -0.006842923794712297,
              "weightedPairwiseAccuracy": -0.014357166603375049
            }
          },
          {
            "key": "edgePattern",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.504,
              "top3Accuracy": 0.832,
              "meanBestRank": 2.204,
              "meanRegret": 9530.42,
              "meanRegretInDiscs": 0.9530420000000001,
              "maxRegret": 140000,
              "maxRegretInDiscs": 14
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3904,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 16,
              "accuracy": 0.6071539657853811,
              "weightedAccuracy": 0.6411599702547047,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": 0.02400000000000002,
              "top3Accuracy": 0.016000000000000014,
              "meanRegret": -353.28800000000047,
              "pairwiseAccuracy": 0.01819595645412131,
              "weightedPairwiseAccuracy": 0.01619803772857109
            }
          },
          {
            "key": "cornerPattern",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.388,
              "top3Accuracy": 0.788,
              "meanBestRank": 2.716,
              "meanRegret": 16027.644,
              "meanRegretInDiscs": 1.6027644,
              "maxRegret": 260000,
              "maxRegretInDiscs": 26
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3456,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 33,
              "accuracy": 0.5374805598755832,
              "weightedAccuracy": 0.5443441742100714,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": -0.09199999999999997,
              "top3Accuracy": -0.027999999999999914,
              "meanRegret": 6143.936,
              "pairwiseAccuracy": -0.05147744945567656,
              "weightedPairwiseAccuracy": -0.08061775831606222
            }
          },
          {
            "key": "discDifferential",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.484,
              "top3Accuracy": 0.828,
              "meanBestRank": 2.304,
              "meanRegret": 10550.552,
              "meanRegretInDiscs": 1.0550552,
              "maxRegret": 160000,
              "maxRegretInDiscs": 16
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3794,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 27,
              "accuracy": 0.5900466562986003,
              "weightedAccuracy": 0.6216718658948612,
              "maxTeacherGap": 480000
            },
            "deltas": {
              "top1Accuracy": 0.0040000000000000036,
              "top3Accuracy": 0.01200000000000001,
              "meanRegret": 666.8439999999991,
              "pairwiseAccuracy": 0.0010886469673405674,
              "weightedPairwiseAccuracy": -0.0032900666312724036
            }
          },
          {
            "key": "parity",
            "holdoutRoots": {
              "count": 250,
              "top1Accuracy": 0.48,
              "top3Accuracy": 0.816,
              "meanBestRank": 2.336,
              "meanRegret": 9883.708,
              "meanRegretInDiscs": 0.9883708000000001,
              "maxRegret": 160000,
              "maxRegretInDiscs": 16
            },
            "pairwise": {
              "comparablePairs": 6430,
              "correctPairs": 3787,
              "tiedTeacherPairs": 1652,
              "tiedPredictionPairs": 9,
              "accuracy": 0.5889580093312597,
              "weightedAccuracy": 0.6249619325261336,
              "maxTeacherGap": 480000
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
              "count": 45,
              "top1Accuracy": 0.5111111111111111,
              "top3Accuracy": 0.8666666666666667,
              "meanBestRank": 1.9777777777777779,
              "meanRegret": 24666.666666666668,
              "meanRegretInDiscs": 2.466666666666667,
              "maxRegret": 140000,
              "maxRegretInDiscs": 14
            },
            "pairwise": {
              "comparablePairs": 497,
              "correctPairs": 218,
              "tiedTeacherPairs": 359,
              "tiedPredictionPairs": 1,
              "accuracy": 0.4386317907444668,
              "weightedAccuracy": 0.49917898193760263,
              "maxTeacherGap": 330000
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.5111111111111111,
                "top3Accuracy": 0.9111111111111111,
                "meanBestRank": 1.8444444444444446,
                "meanRegret": 26444.444444444445,
                "meanRegretInDiscs": 2.6444444444444444,
                "maxRegret": 140000,
                "maxRegretInDiscs": 14
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 237,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 2,
                "accuracy": 0.4768611670020121,
                "weightedAccuracy": 0.5238095238095238,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0.0444444444444444,
                "meanRegret": 1777.7777777777774,
                "pairwiseAccuracy": 0.0382293762575453,
                "weightedPairwiseAccuracy": 0.024630541871921208
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.4666666666666667,
                "top3Accuracy": 0.8444444444444444,
                "meanBestRank": 2.066666666666667,
                "meanRegret": 30444.444444444445,
                "meanRegretInDiscs": 3.0444444444444447,
                "maxRegret": 200000,
                "maxRegretInDiscs": 20
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 215,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 1,
                "accuracy": 0.43259557344064387,
                "weightedAccuracy": 0.48669950738916257,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": -0.0444444444444444,
                "top3Accuracy": -0.022222222222222254,
                "meanRegret": 5777.777777777777,
                "pairwiseAccuracy": -0.006036217303822922,
                "weightedPairwiseAccuracy": -0.012479474548440062
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.5111111111111111,
                "top3Accuracy": 0.8666666666666667,
                "meanBestRank": 1.9555555555555555,
                "meanRegret": 24222.222222222223,
                "meanRegretInDiscs": 2.422222222222222,
                "maxRegret": 140000,
                "maxRegretInDiscs": 14
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 222,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 1,
                "accuracy": 0.44668008048289737,
                "weightedAccuracy": 0.5165845648604269,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": -444.44444444444525,
                "pairwiseAccuracy": 0.00804828973843058,
                "weightedPairwiseAccuracy": 0.017405582922824292
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.5333333333333333,
                "top3Accuracy": 0.8666666666666667,
                "meanBestRank": 1.9333333333333333,
                "meanRegret": 26000,
                "meanRegretInDiscs": 2.6,
                "maxRegret": 140000,
                "maxRegretInDiscs": 14
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 225,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 1,
                "accuracy": 0.45271629778672035,
                "weightedAccuracy": 0.5234811165845649,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": 0.022222222222222254,
                "top3Accuracy": 0,
                "meanRegret": 1333.3333333333321,
                "pairwiseAccuracy": 0.014084507042253558,
                "weightedPairwiseAccuracy": 0.024302134646962237
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.4444444444444444,
                "top3Accuracy": 0.8666666666666667,
                "meanBestRank": 2.0444444444444443,
                "meanRegret": 35111.11111111111,
                "meanRegretInDiscs": 3.511111111111111,
                "maxRegret": 200000,
                "maxRegretInDiscs": 20
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 210,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 3,
                "accuracy": 0.4225352112676056,
                "weightedAccuracy": 0.4827586206896552,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": -0.06666666666666665,
                "top3Accuracy": 0,
                "meanRegret": 10444.444444444442,
                "pairwiseAccuracy": -0.01609657947686116,
                "weightedPairwiseAccuracy": -0.016420361247947435
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.5111111111111111,
                "top3Accuracy": 0.8666666666666667,
                "meanBestRank": 1.8888888888888888,
                "meanRegret": 28444.444444444445,
                "meanRegretInDiscs": 2.8444444444444446,
                "maxRegret": 140000,
                "maxRegretInDiscs": 14
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 221,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 2,
                "accuracy": 0.44466800804828976,
                "weightedAccuracy": 0.5008210180623974,
                "maxTeacherGap": 330000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 3777.7777777777774,
                "pairwiseAccuracy": 0.006036217303822977,
                "weightedPairwiseAccuracy": 0.001642036124794799
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 45,
                "top1Accuracy": 0.5111111111111111,
                "top3Accuracy": 0.8666666666666667,
                "meanBestRank": 1.9777777777777779,
                "meanRegret": 24666.666666666668,
                "meanRegretInDiscs": 2.466666666666667,
                "maxRegret": 140000,
                "maxRegretInDiscs": 14
              },
              "pairwise": {
                "comparablePairs": 497,
                "correctPairs": 218,
                "tiedTeacherPairs": 359,
                "tiedPredictionPairs": 1,
                "accuracy": 0.4386317907444668,
                "weightedAccuracy": 0.49917898193760263,
                "maxTeacherGap": 330000
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
              "count": 50,
              "top1Accuracy": 0.84,
              "top3Accuracy": 1,
              "meanBestRank": 1.22,
              "meanRegret": 11600,
              "meanRegretInDiscs": 1.16,
              "maxRegret": 160000,
              "maxRegretInDiscs": 16
            },
            "pairwise": {
              "comparablePairs": 532,
              "correctPairs": 302,
              "tiedTeacherPairs": 807,
              "tiedPredictionPairs": 1,
              "accuracy": 0.5676691729323309,
              "weightedAccuracy": 0.5754789272030651,
              "maxTeacherGap": 480000
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.82,
                "top3Accuracy": 1,
                "meanBestRank": 1.22,
                "meanRegret": 12200,
                "meanRegretInDiscs": 1.22,
                "maxRegret": 180000,
                "maxRegretInDiscs": 18
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 296,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 3,
                "accuracy": 0.556390977443609,
                "weightedAccuracy": 0.5251596424010218,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": -0.020000000000000018,
                "top3Accuracy": 0,
                "meanRegret": 600,
                "pairwiseAccuracy": -0.011278195488721887,
                "weightedPairwiseAccuracy": -0.050319284802043396
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.84,
                "top3Accuracy": 1,
                "meanBestRank": 1.22,
                "meanRegret": 11600,
                "meanRegretInDiscs": 1.16,
                "maxRegret": 160000,
                "maxRegretInDiscs": 16
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 301,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 1,
                "accuracy": 0.5657894736842105,
                "weightedAccuracy": 0.5744572158365262,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.00187969924812037,
                "weightedPairwiseAccuracy": -0.0010217113665389466
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.8,
                "top3Accuracy": 0.98,
                "meanBestRank": 1.3,
                "meanRegret": 14800,
                "meanRegretInDiscs": 1.48,
                "maxRegret": 160000,
                "maxRegretInDiscs": 16
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 313,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 1,
                "accuracy": 0.5883458646616542,
                "weightedAccuracy": 0.6010217113665389,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": -0.039999999999999925,
                "top3Accuracy": -0.020000000000000018,
                "meanRegret": 3200,
                "pairwiseAccuracy": 0.020676691729323293,
                "weightedPairwiseAccuracy": 0.025542784163473775
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.88,
                "top3Accuracy": 0.98,
                "meanBestRank": 1.24,
                "meanRegret": 6800,
                "meanRegretInDiscs": 0.68,
                "maxRegret": 120000,
                "maxRegretInDiscs": 12
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 325,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 2,
                "accuracy": 0.6109022556390977,
                "weightedAccuracy": 0.59029374201788,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": 0.040000000000000036,
                "top3Accuracy": -0.020000000000000018,
                "meanRegret": -4800,
                "pairwiseAccuracy": 0.043233082706766846,
                "weightedPairwiseAccuracy": 0.014814814814814836
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.64,
                "top3Accuracy": 0.94,
                "meanBestRank": 1.6,
                "meanRegret": 26800,
                "meanRegretInDiscs": 2.68,
                "maxRegret": 260000,
                "maxRegretInDiscs": 26
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 211,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 3,
                "accuracy": 0.3966165413533835,
                "weightedAccuracy": 0.42171136653895275,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": -0.19999999999999996,
                "top3Accuracy": -0.06000000000000005,
                "meanRegret": 15200,
                "pairwiseAccuracy": -0.1710526315789474,
                "weightedPairwiseAccuracy": -0.1537675606641124
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.84,
                "top3Accuracy": 1,
                "meanBestRank": 1.2,
                "meanRegret": 11600,
                "meanRegretInDiscs": 1.16,
                "maxRegret": 160000,
                "maxRegretInDiscs": 16
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 301,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 4,
                "accuracy": 0.5657894736842105,
                "weightedAccuracy": 0.5693486590038315,
                "maxTeacherGap": 480000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.00187969924812037,
                "weightedPairwiseAccuracy": -0.006130268199233679
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 50,
                "top1Accuracy": 0.84,
                "top3Accuracy": 1,
                "meanBestRank": 1.22,
                "meanRegret": 11600,
                "meanRegretInDiscs": 1.16,
                "maxRegret": 160000,
                "maxRegretInDiscs": 16
              },
              "pairwise": {
                "comparablePairs": 532,
                "correctPairs": 302,
                "tiedTeacherPairs": 807,
                "tiedPredictionPairs": 1,
                "accuracy": 0.5676691729323309,
                "weightedAccuracy": 0.5754789272030651,
                "maxTeacherGap": 480000
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
              "count": 49,
              "top1Accuracy": 0.3673469387755102,
              "top3Accuracy": 0.7551020408163265,
              "meanBestRank": 2.857142857142857,
              "meanRegret": 9090.34693877551,
              "meanRegretInDiscs": 0.909034693877551,
              "maxRegret": 60000,
              "maxRegretInDiscs": 6
            },
            "pairwise": {
              "comparablePairs": 1299,
              "correctPairs": 751,
              "tiedTeacherPairs": 434,
              "tiedPredictionPairs": 2,
              "accuracy": 0.5781370284834488,
              "weightedAccuracy": 0.6823817125018644,
              "maxTeacherGap": 380000
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.30612244897959184,
                "top3Accuracy": 0.5102040816326531,
                "meanBestRank": 4.36734693877551,
                "meanRegret": 13192.102040816326,
                "meanRegretInDiscs": 1.3192102040816325,
                "maxRegret": 140000,
                "maxRegretInDiscs": 14
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 605,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 7,
                "accuracy": 0.4657428791377983,
                "weightedAccuracy": 0.44525070496142805,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": -0.06122448979591838,
                "top3Accuracy": -0.2448979591836734,
                "meanRegret": 4101.7551020408155,
                "pairwiseAccuracy": -0.11239414934565051,
                "weightedPairwiseAccuracy": -0.23713100754043637
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.3673469387755102,
                "top3Accuracy": 0.7755102040816326,
                "meanBestRank": 2.877551020408163,
                "meanRegret": 10314.836734693878,
                "meanRegretInDiscs": 1.0314836734693877,
                "maxRegret": 80000,
                "maxRegretInDiscs": 8
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 751,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 2,
                "accuracy": 0.5781370284834488,
                "weightedAccuracy": 0.6905396639875263,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0.020408163265306145,
                "meanRegret": 1224.4897959183672,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0.008157951485661896
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.32653061224489793,
                "top3Accuracy": 0.6326530612244898,
                "meanBestRank": 2.8979591836734695,
                "meanRegret": 11673.591836734693,
                "meanRegretInDiscs": 1.1673591836734694,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 706,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 2,
                "accuracy": 0.5434949961508853,
                "weightedAccuracy": 0.5842915378112589,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": -0.04081632653061229,
                "top3Accuracy": -0.12244897959183665,
                "meanRegret": 2583.2448979591827,
                "pairwiseAccuracy": -0.03464203233256358,
                "weightedPairwiseAccuracy": -0.09809017469060555
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.3673469387755102,
                "top3Accuracy": 0.7551020408163265,
                "meanBestRank": 2.877551020408163,
                "meanRegret": 9090.34693877551,
                "meanRegretInDiscs": 0.909034693877551,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 751,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 2,
                "accuracy": 0.5781370284834488,
                "weightedAccuracy": 0.6831621773853946,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": 0,
                "weightedPairwiseAccuracy": 0.0007804648835302297
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.3877551020408163,
                "top3Accuracy": 0.8163265306122449,
                "meanBestRank": 2.63265306122449,
                "meanRegret": 7928.7959183673465,
                "meanRegretInDiscs": 0.7928795918367346,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 785,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 5,
                "accuracy": 0.6043110084680523,
                "weightedAccuracy": 0.7122539531621367,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": 0.02040816326530609,
                "top3Accuracy": 0.061224489795918435,
                "meanRegret": -1161.5510204081638,
                "pairwiseAccuracy": 0.026173979984603468,
                "weightedPairwiseAccuracy": 0.029872240660272276
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.3673469387755102,
                "top3Accuracy": 0.7755102040816326,
                "meanBestRank": 2.816326530612245,
                "meanRegret": 9292.938775510203,
                "meanRegretInDiscs": 0.9292938775510203,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 741,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 8,
                "accuracy": 0.5704387990762124,
                "weightedAccuracy": 0.6685425675407655,
                "maxTeacherGap": 380000
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0.020408163265306145,
                "meanRegret": 202.59183673469306,
                "pairwiseAccuracy": -0.007698229407236412,
                "weightedPairwiseAccuracy": -0.013839144961098948
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 49,
                "top1Accuracy": 0.3673469387755102,
                "top3Accuracy": 0.7551020408163265,
                "meanBestRank": 2.857142857142857,
                "meanRegret": 9090.34693877551,
                "meanRegretInDiscs": 0.909034693877551,
                "maxRegret": 60000,
                "maxRegretInDiscs": 6
              },
              "pairwise": {
                "comparablePairs": 1299,
                "correctPairs": 751,
                "tiedTeacherPairs": 434,
                "tiedPredictionPairs": 2,
                "accuracy": 0.5781370284834488,
                "weightedAccuracy": 0.6823817125018644,
                "maxTeacherGap": 380000
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
          "key": "child-15-16",
          "minEmpties": 15,
          "maxEmpties": 16,
          "baseline": {
            "holdoutRoots": {
              "count": 52,
              "top1Accuracy": 0.40384615384615385,
              "top3Accuracy": 0.6923076923076923,
              "meanBestRank": 2.6346153846153846,
              "meanRegret": 2339.6923076923076,
              "meanRegretInDiscs": 0.23396923076923076,
              "maxRegret": 45758,
              "maxRegretInDiscs": 4.5758
            },
            "pairwise": {
              "comparablePairs": 1858,
              "correctPairs": 1201,
              "tiedTeacherPairs": 24,
              "tiedPredictionPairs": 2,
              "accuracy": 0.6463939720129172,
              "weightedAccuracy": 0.7706392458525884,
              "maxTeacherGap": 94096
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.28846153846153844,
                "top3Accuracy": 0.5961538461538461,
                "meanBestRank": 3.5961538461538463,
                "meanRegret": 5549.134615384615,
                "meanRegretInDiscs": 0.5549134615384615,
                "maxRegret": 64133,
                "maxRegretInDiscs": 6.4133
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1061,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 10,
                "accuracy": 0.5710441334768568,
                "weightedAccuracy": 0.6246391134378981,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": -0.11538461538461542,
                "top3Accuracy": -0.09615384615384615,
                "meanRegret": 3209.4423076923076,
                "pairwiseAccuracy": -0.07534983853606037,
                "weightedPairwiseAccuracy": -0.14600013241469023
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.38461538461538464,
                "top3Accuracy": 0.6923076923076923,
                "meanBestRank": 2.6923076923076925,
                "meanRegret": 2849.019230769231,
                "meanRegretInDiscs": 0.2849019230769231,
                "maxRegret": 45758,
                "maxRegretInDiscs": 4.5758
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1204,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 2,
                "accuracy": 0.6480086114101185,
                "weightedAccuracy": 0.7722341644940683,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": -0.019230769230769218,
                "top3Accuracy": 0,
                "meanRegret": 509.3269230769233,
                "pairwiseAccuracy": 0.0016146393972013007,
                "weightedPairwiseAccuracy": 0.001594918641479981
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.40384615384615385,
                "top3Accuracy": 0.6923076923076923,
                "meanBestRank": 2.6923076923076925,
                "meanRegret": 2339.6923076923076,
                "meanRegretInDiscs": 0.23396923076923076,
                "maxRegret": 45758,
                "maxRegretInDiscs": 4.5758
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1195,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 2,
                "accuracy": 0.6431646932185145,
                "weightedAccuracy": 0.7654363161328684,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.0032292787944026013,
                "weightedPairwiseAccuracy": -0.005202929719719918
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.36538461538461536,
                "top3Accuracy": 0.7115384615384616,
                "meanBestRank": 2.6538461538461537,
                "meanRegret": 4268.2307692307695,
                "meanRegretInDiscs": 0.42682307692307697,
                "maxRegret": 66066,
                "maxRegretInDiscs": 6.6066
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1213,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 5,
                "accuracy": 0.6528525296017222,
                "weightedAccuracy": 0.7792649743634538,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": -0.03846153846153849,
                "top3Accuracy": 0.019230769230769273,
                "meanRegret": 1928.538461538462,
                "pairwiseAccuracy": 0.006458557588805092,
                "weightedPairwiseAccuracy": 0.008625728510865405
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.3269230769230769,
                "top3Accuracy": 0.6923076923076923,
                "meanBestRank": 3.3653846153846154,
                "meanRegret": 6643.134615384615,
                "meanRegretInDiscs": 0.6643134615384615,
                "maxRegret": 76252,
                "maxRegretInDiscs": 7.6252
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1051,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 6,
                "accuracy": 0.5656620021528526,
                "weightedAccuracy": 0.5969337322321494,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": -0.07692307692307693,
                "top3Accuracy": 0,
                "meanRegret": 4303.442307692308,
                "pairwiseAccuracy": -0.08073196986006459,
                "weightedPairwiseAccuracy": -0.17370551362043896
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.40384615384615385,
                "top3Accuracy": 0.7115384615384616,
                "meanBestRank": 2.6538461538461537,
                "meanRegret": 2255.153846153846,
                "meanRegretInDiscs": 0.22551538461538462,
                "maxRegret": 45758,
                "maxRegretInDiscs": 4.5758
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1220,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 8,
                "accuracy": 0.6566200215285253,
                "weightedAccuracy": 0.7829467127632459,
                "maxTeacherGap": 94096
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0.019230769230769273,
                "meanRegret": -84.53846153846143,
                "pairwiseAccuracy": 0.010226049515608127,
                "weightedPairwiseAccuracy": 0.012307466910657539
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 52,
                "top1Accuracy": 0.40384615384615385,
                "top3Accuracy": 0.6923076923076923,
                "meanBestRank": 2.6346153846153846,
                "meanRegret": 2339.6923076923076,
                "meanRegretInDiscs": 0.23396923076923076,
                "maxRegret": 45758,
                "maxRegretInDiscs": 4.5758
              },
              "pairwise": {
                "comparablePairs": 1858,
                "correctPairs": 1201,
                "tiedTeacherPairs": 24,
                "tiedPredictionPairs": 2,
                "accuracy": 0.6463939720129172,
                "weightedAccuracy": 0.7706392458525884,
                "maxTeacherGap": 94096
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
          "key": "child-17-18",
          "minEmpties": 17,
          "maxEmpties": 18,
          "baseline": {
            "holdoutRoots": {
              "count": 54,
              "top1Accuracy": 0.2962962962962963,
              "top3Accuracy": 0.7777777777777778,
              "meanBestRank": 2.9074074074074074,
              "meanRegret": 3959.925925925926,
              "meanRegretInDiscs": 0.3959925925925926,
              "maxRegret": 27573,
              "maxRegretInDiscs": 2.7573
            },
            "pairwise": {
              "comparablePairs": 2244,
              "correctPairs": 1315,
              "tiedTeacherPairs": 28,
              "tiedPredictionPairs": 3,
              "accuracy": 0.5860071301247772,
              "weightedAccuracy": 0.6847707260009455,
              "maxTeacherGap": 73876
            }
          },
          "byFeature": [
            {
              "key": "mobility",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.25925925925925924,
                "top3Accuracy": 0.6851851851851852,
                "meanBestRank": 3.314814814814815,
                "meanRegret": 4508.12962962963,
                "meanRegretInDiscs": 0.45081296296296297,
                "maxRegret": 27573,
                "maxRegretInDiscs": 2.7573
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1251,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 30,
                "accuracy": 0.5574866310160428,
                "weightedAccuracy": 0.639165912168388,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": -0.037037037037037035,
                "top3Accuracy": -0.09259259259259256,
                "meanRegret": 548.2037037037035,
                "pairwiseAccuracy": -0.028520499108734443,
                "weightedPairwiseAccuracy": -0.045604813832557434
              }
            },
            {
              "key": "corners",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.2962962962962963,
                "top3Accuracy": 0.7777777777777778,
                "meanBestRank": 2.9074074074074074,
                "meanRegret": 3959.925925925926,
                "meanRegretInDiscs": 0.3959925925925926,
                "maxRegret": 27573,
                "maxRegretInDiscs": 2.7573
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1314,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 3,
                "accuracy": 0.5855614973262032,
                "weightedAccuracy": 0.68450818730787,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.00044563279857401383,
                "weightedPairwiseAccuracy": -0.00026253869307546474
              }
            },
            {
              "key": "cornerAdjacency",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.2962962962962963,
                "top3Accuracy": 0.7777777777777778,
                "meanBestRank": 2.925925925925926,
                "meanRegret": 3959.925925925926,
                "meanRegretInDiscs": 0.3959925925925926,
                "maxRegret": 27573,
                "maxRegretInDiscs": 2.7573
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1307,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 3,
                "accuracy": 0.5824420677361853,
                "weightedAccuracy": 0.6722562569941323,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": 0,
                "top3Accuracy": 0,
                "meanRegret": 0,
                "pairwiseAccuracy": -0.0035650623885918886,
                "weightedPairwiseAccuracy": -0.01251446900681319
              }
            },
            {
              "key": "edgePattern",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.3888888888888889,
                "top3Accuracy": 0.8518518518518519,
                "meanBestRank": 2.2777777777777777,
                "meanRegret": 3800.5555555555557,
                "meanRegretInDiscs": 0.3800555555555556,
                "maxRegret": 40425,
                "maxRegretInDiscs": 4.0425
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1390,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 6,
                "accuracy": 0.6194295900178253,
                "weightedAccuracy": 0.7252991151671514,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": 0.09259259259259262,
                "top3Accuracy": 0.07407407407407407,
                "meanRegret": -159.37037037037044,
                "pairwiseAccuracy": 0.03342245989304804,
                "weightedPairwiseAccuracy": 0.040528389166205936
              }
            },
            {
              "key": "cornerPattern",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.16666666666666666,
                "top3Accuracy": 0.6481481481481481,
                "meanBestRank": 3.759259259259259,
                "meanRegret": 6536.240740740741,
                "meanRegretInDiscs": 0.6536240740740741,
                "maxRegret": 52847,
                "maxRegretInDiscs": 5.2847
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1199,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 16,
                "accuracy": 0.5343137254901961,
                "weightedAccuracy": 0.5542866986627353,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": -0.12962962962962962,
                "top3Accuracy": -0.12962962962962965,
                "meanRegret": 2576.314814814815,
                "pairwiseAccuracy": -0.051693404634581164,
                "weightedPairwiseAccuracy": -0.13048402733821018
              }
            },
            {
              "key": "discDifferential",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.3148148148148148,
                "top3Accuracy": 0.7962962962962963,
                "meanBestRank": 2.8703703703703702,
                "meanRegret": 3796.5925925925926,
                "meanRegretInDiscs": 0.37965925925925925,
                "maxRegret": 27573,
                "maxRegretInDiscs": 2.7573
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1311,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 5,
                "accuracy": 0.5842245989304813,
                "weightedAccuracy": 0.6819792159093641,
                "maxTeacherGap": 73876
              },
              "deltas": {
                "top1Accuracy": 0.018518518518518545,
                "top3Accuracy": 0.01851851851851849,
                "meanRegret": -163.33333333333348,
                "pairwiseAccuracy": -0.0017825311942959443,
                "weightedPairwiseAccuracy": -0.002791510091581406
              }
            },
            {
              "key": "parity",
              "holdoutRoots": {
                "count": 54,
                "top1Accuracy": 0.2962962962962963,
                "top3Accuracy": 0.7777777777777778,
                "meanBestRank": 2.9074074074074074,
                "meanRegret": 3959.925925925926,
                "meanRegretInDiscs": 0.3959925925925926,
                "maxRegret": 27573,
                "maxRegretInDiscs": 2.7573
              },
              "pairwise": {
                "comparablePairs": 2244,
                "correctPairs": 1315,
                "tiedTeacherPairs": 28,
                "tiedPredictionPairs": 3,
                "accuracy": 0.5860071301247772,
                "weightedAccuracy": 0.6847707260009455,
                "maxTeacherGap": 73876
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
          "key": "flipCount",
          "count": 2031,
          "correlation": 0.12488288776301569,
          "meanAbsFeature": 2.879862136878385
        },
        {
          "key": "passFlag",
          "count": 2031,
          "correlation": -0.08277976964621274,
          "meanAbsFeature": 0.002461841457410143
        },
        {
          "key": "riskCSquare",
          "count": 2031,
          "correlation": 0.07640253965250322,
          "meanAbsFeature": 0.22451994091580502
        },
        {
          "key": "opponentCornerReplies",
          "count": 2031,
          "correlation": 0.044544446248423276,
          "meanAbsFeature": 0.6794682422451994
        },
        {
          "key": "opponentMoveCountRaw",
          "count": 2031,
          "correlation": -0.017158155800912223,
          "meanAbsFeature": 7.794190054160512
        },
        {
          "key": "myMoveCountRaw",
          "count": 2031,
          "correlation": -0.0163196933248015,
          "meanAbsFeature": 7.75972427375677
        },
        {
          "key": "riskXSquare",
          "count": 2031,
          "correlation": 0.008843657460839654,
          "meanAbsFeature": 0.07680945347119646
        }
      ],
      "byBucket": [
        {
          "key": "child-10-10",
          "minEmpties": 10,
          "maxEmpties": 10,
          "correlations": [
            {
              "key": "riskXSquare",
              "count": 285,
              "correlation": -0.13212697162278572,
              "meanAbsFeature": 0.0912280701754386
            },
            {
              "key": "riskCSquare",
              "count": 285,
              "correlation": 0.1302584296246836,
              "meanAbsFeature": 0.2736842105263158
            },
            {
              "key": "opponentMoveCountRaw",
              "count": 285,
              "correlation": -0.11338847302776327,
              "meanAbsFeature": 5.992982456140351
            },
            {
              "key": "passFlag",
              "count": 285,
              "correlation": -0.10511624905508792,
              "meanAbsFeature": 0.007017543859649123
            },
            {
              "key": "flipCount",
              "count": 285,
              "correlation": 0.03353206785033286,
              "meanAbsFeature": 3.0210526315789474
            },
            {
              "key": "opponentCornerReplies",
              "count": 285,
              "correlation": 0.013206676695506974,
              "meanAbsFeature": 0.7263157894736842
            },
            {
              "key": "myMoveCountRaw",
              "count": 285,
              "correlation": -0.010903811446274928,
              "meanAbsFeature": 5.628070175438596
            }
          ]
        },
        {
          "key": "child-11-12",
          "minEmpties": 11,
          "maxEmpties": 12,
          "correlations": [
            {
              "key": "flipCount",
              "count": 377,
              "correlation": 0.16743062479344034,
              "meanAbsFeature": 3.042440318302387
            },
            {
              "key": "opponentMoveCountRaw",
              "count": 377,
              "correlation": -0.05518311449312696,
              "meanAbsFeature": 6.83289124668435
            },
            {
              "key": "passFlag",
              "count": 377,
              "correlation": -0.045106875830737095,
              "meanAbsFeature": 0.002652519893899204
            },
            {
              "key": "myMoveCountRaw",
              "count": 377,
              "correlation": -0.04006036645651704,
              "meanAbsFeature": 6.907161803713528
            },
            {
              "key": "riskXSquare",
              "count": 377,
              "correlation": 0.03622676152372545,
              "meanAbsFeature": 0.07427055702917772
            },
            {
              "key": "riskCSquare",
              "count": 377,
              "correlation": 0.033697043505509484,
              "meanAbsFeature": 0.2413793103448276
            },
            {
              "key": "opponentCornerReplies",
              "count": 377,
              "correlation": 0.011168989922398863,
              "meanAbsFeature": 0.6631299734748011
            }
          ]
        },
        {
          "key": "child-13-14",
          "minEmpties": 13,
          "maxEmpties": 14,
          "correlations": [
            {
              "key": "flipCount",
              "count": 418,
              "correlation": 0.17902339284359883,
              "meanAbsFeature": 3.035885167464115
            },
            {
              "key": "opponentCornerReplies",
              "count": 418,
              "correlation": 0.1519989436844793,
              "meanAbsFeature": 0.6961722488038278
            },
            {
              "key": "riskXSquare",
              "count": 418,
              "correlation": 0.14410825496027194,
              "meanAbsFeature": 0.07655502392344497
            },
            {
              "key": "myMoveCountRaw",
              "count": 418,
              "correlation": -0.06839310219067549,
              "meanAbsFeature": 7.988038277511961
            },
            {
              "key": "riskCSquare",
              "count": 418,
              "correlation": 0.05512687225159477,
              "meanAbsFeature": 0.21291866028708134
            },
            {
              "key": "opponentMoveCountRaw",
              "count": 418,
              "correlation": 0.03918967862880289,
              "meanAbsFeature": 7.258373205741627
            },
            {
              "key": "passFlag",
              "count": 418,
              "correlation": null,
              "meanAbsFeature": 0
            }
          ]
        },
        {
          "key": "child-15-16",
          "minEmpties": 15,
          "maxEmpties": 16,
          "correlations": [
            {
              "key": "passFlag",
              "count": 451,
              "correlation": -0.27844589584159896,
              "meanAbsFeature": 0.004434589800443459
            },
            {
              "key": "flipCount",
              "count": 451,
              "correlation": 0.22963511382807023,
              "meanAbsFeature": 2.731707317073171
            },
            {
              "key": "riskCSquare",
              "count": 451,
              "correlation": 0.14378625549374283,
              "meanAbsFeature": 0.19955654101995565
            },
            {
              "key": "opponentCornerReplies",
              "count": 451,
              "correlation": 0.06976942079475983,
              "meanAbsFeature": 0.6385809312638581
            },
            {
              "key": "opponentMoveCountRaw",
              "count": 451,
              "correlation": 0.04501573833921534,
              "meanAbsFeature": 8.288248337028826
            },
            {
              "key": "riskXSquare",
              "count": 451,
              "correlation": 0.006190359527801371,
              "meanAbsFeature": 0.082039911308204
            },
            {
              "key": "myMoveCountRaw",
              "count": 451,
              "correlation": -0.0003556569196480277,
              "meanAbsFeature": 8.286031042128602
            }
          ]
        },
        {
          "key": "child-17-18",
          "minEmpties": 17,
          "maxEmpties": 18,
          "correlations": [
            {
              "key": "riskCSquare",
              "count": 500,
              "correlation": 0.21495123264457172,
              "meanAbsFeature": 0.216
            },
            {
              "key": "flipCount",
              "count": 500,
              "correlation": 0.1540735749419955,
              "meanAbsFeature": 2.68
            },
            {
              "key": "opponentCornerReplies",
              "count": 500,
              "correlation": 0.062362822030394935,
              "meanAbsFeature": 0.688
            },
            {
              "key": "myMoveCountRaw",
              "count": 500,
              "correlation": 0.06058547915035916,
              "meanAbsFeature": 8.952
            },
            {
              "key": "riskXSquare",
              "count": 500,
              "correlation": -0.03591193877422801,
              "meanAbsFeature": 0.066
            },
            {
              "key": "opponentMoveCountRaw",
              "count": 500,
              "correlation": 0.007544498770713117,
              "meanAbsFeature": 9.548
            },
            {
              "key": "passFlag",
              "count": 500,
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
          "count": 285,
          "mae": 26618.481694474896,
          "rmse": 39653.493189158144,
          "meanResidual": -575.9333426048782,
          "stdDevResidual": 39649.31049699966,
          "maxAbsResidual": 259582.96132409517,
          "maeInDiscs": 2.66184816944749,
          "rmseInDiscs": 3.9653493189158144
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 285,
          "mae": 26238.48728092483,
          "rmse": 39517.012018802736,
          "meanResidual": 1.0722463852480837e-12,
          "stdDevResidual": 39517.012018802736,
          "maxAbsResidual": 252485.02854196436,
          "maeInDiscs": 2.623848728092483,
          "rmseInDiscs": 3.9517012018802737
        },
        "holdoutRoots": {
          "count": 45,
          "top1Accuracy": 0.5111111111111111,
          "top3Accuracy": 0.8666666666666667,
          "meanBestRank": 1.9777777777777779,
          "meanRegret": 24666.666666666668,
          "meanRegretInDiscs": 2.466666666666667,
          "maxRegret": 140000,
          "maxRegretInDiscs": 14
        },
        "holdoutPairwise": {
          "comparablePairs": 497,
          "correctPairs": 218,
          "tiedTeacherPairs": 359,
          "tiedPredictionPairs": 1,
          "accuracy": 0.4386317907444668,
          "weightedAccuracy": 0.49917898193760263,
          "maxTeacherGap": 330000
        }
      },
      {
        "key": "child-11-12",
        "minEmpties": 11,
        "maxEmpties": 12,
        "holdoutMoves": {
          "targetMode": "root-mean",
          "count": 377,
          "mae": 24717.32326937866,
          "rmse": 46148.293902840494,
          "meanResidual": -102.38843713244351,
          "stdDevResidual": 46148.180318956096,
          "maxAbsResidual": 381621.4263288247,
          "maeInDiscs": 2.471732326937866,
          "rmseInDiscs": 4.61482939028405
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 377,
          "mae": 24258.02184188364,
          "rmse": 45962.12262381515,
          "meanResidual": -1.7755652533285814e-12,
          "stdDevResidual": 45962.12262381515,
          "maxAbsResidual": 378412.43692501046,
          "maeInDiscs": 2.425802184188364,
          "rmseInDiscs": 4.596212262381515
        },
        "holdoutRoots": {
          "count": 50,
          "top1Accuracy": 0.84,
          "top3Accuracy": 1,
          "meanBestRank": 1.22,
          "meanRegret": 11600,
          "meanRegretInDiscs": 1.16,
          "maxRegret": 160000,
          "maxRegretInDiscs": 16
        },
        "holdoutPairwise": {
          "comparablePairs": 532,
          "correctPairs": 302,
          "tiedTeacherPairs": 807,
          "tiedPredictionPairs": 1,
          "accuracy": 0.5676691729323309,
          "weightedAccuracy": 0.5754789272030651,
          "maxTeacherGap": 480000
        }
      },
      {
        "key": "child-13-14",
        "minEmpties": 13,
        "maxEmpties": 14,
        "holdoutMoves": {
          "targetMode": "root-mean",
          "count": 418,
          "mae": 12718.897884182674,
          "rmse": 27114.05827699951,
          "meanResidual": 209.2074900451743,
          "stdDevResidual": 27113.251160173222,
          "maxAbsResidual": 312080.71010956564,
          "maeInDiscs": 1.2718897884182674,
          "rmseInDiscs": 2.711405827699951
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 418,
          "mae": 12619.040542700872,
          "rmse": 27061.085215582334,
          "meanResidual": 1.0095826354608582e-12,
          "stdDevResidual": 27061.085215582334,
          "maxAbsResidual": 310658.8963538561,
          "maeInDiscs": 1.2619040542700872,
          "rmseInDiscs": 2.7061085215582334
        },
        "holdoutRoots": {
          "count": 49,
          "top1Accuracy": 0.3673469387755102,
          "top3Accuracy": 0.7551020408163265,
          "meanBestRank": 2.857142857142857,
          "meanRegret": 9090.34693877551,
          "meanRegretInDiscs": 0.909034693877551,
          "maxRegret": 60000,
          "maxRegretInDiscs": 6
        },
        "holdoutPairwise": {
          "comparablePairs": 1299,
          "correctPairs": 751,
          "tiedTeacherPairs": 434,
          "tiedPredictionPairs": 2,
          "accuracy": 0.5781370284834488,
          "weightedAccuracy": 0.6823817125018644,
          "maxTeacherGap": 380000
        }
      },
      {
        "key": "child-15-16",
        "minEmpties": 15,
        "maxEmpties": 16,
        "holdoutMoves": {
          "targetMode": "root-mean",
          "count": 451,
          "mae": 6839.011900149005,
          "rmse": 11731.022688209081,
          "meanResidual": 159.1254680701569,
          "stdDevResidual": 11729.94340978198,
          "maxAbsResidual": 63846.13668503804,
          "maeInDiscs": 0.6839011900149005,
          "rmseInDiscs": 1.173102268820908
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 451,
          "mae": 6608.153095313383,
          "rmse": 11578.121674615737,
          "meanResidual": -3.7105770537964254e-13,
          "stdDevResidual": 11578.121674615737,
          "maxAbsResidual": 60904.93867376432,
          "maeInDiscs": 0.6608153095313384,
          "rmseInDiscs": 1.1578121674615738
        },
        "holdoutRoots": {
          "count": 52,
          "top1Accuracy": 0.40384615384615385,
          "top3Accuracy": 0.6923076923076923,
          "meanBestRank": 2.6346153846153846,
          "meanRegret": 2339.6923076923076,
          "meanRegretInDiscs": 0.23396923076923076,
          "maxRegret": 45758,
          "maxRegretInDiscs": 4.5758
        },
        "holdoutPairwise": {
          "comparablePairs": 1858,
          "correctPairs": 1201,
          "tiedTeacherPairs": 24,
          "tiedPredictionPairs": 2,
          "accuracy": 0.6463939720129172,
          "weightedAccuracy": 0.7706392458525884,
          "maxTeacherGap": 94096
        }
      },
      {
        "key": "child-17-18",
        "minEmpties": 17,
        "maxEmpties": 18,
        "holdoutMoves": {
          "targetMode": "root-mean",
          "count": 500,
          "mae": 5765.780579923171,
          "rmse": 8953.529495702734,
          "meanResidual": 2.3361612276188217,
          "stdDevResidual": 8953.529190926312,
          "maxAbsResidual": 60122.23379380054,
          "maeInDiscs": 0.5765780579923171,
          "rmseInDiscs": 0.8953529495702734
        },
        "holdoutMovesRawAligned": {
          "alignment": "per-root-mean",
          "count": 500,
          "mae": 5589.301668728477,
          "rmse": 8763.45713827135,
          "meanResidual": -7.275957614183426e-13,
          "stdDevResidual": 8763.45713827135,
          "maxAbsResidual": 59348.99720033431,
          "maeInDiscs": 0.5589301668728477,
          "rmseInDiscs": 0.8763457138271349
        },
        "holdoutRoots": {
          "count": 54,
          "top1Accuracy": 0.2962962962962963,
          "top3Accuracy": 0.7777777777777778,
          "meanBestRank": 2.9074074074074074,
          "meanRegret": 3959.925925925926,
          "meanRegretInDiscs": 0.3959925925925926,
          "maxRegret": 27573,
          "maxRegretInDiscs": 2.7573
        },
        "holdoutPairwise": {
          "comparablePairs": 2244,
          "correctPairs": 1315,
          "tiedTeacherPairs": 28,
          "tiedPredictionPairs": 3,
          "accuracy": 0.5860071301247772,
          "weightedAccuracy": 0.6847707260009455,
          "maxTeacherGap": 73876
        }
      }
    ],
    "teacherConfig": {
      "exactRootMaxEmpties": 14,
      "exactRootTimeLimitMs": 60000,
      "teacherDepth": 6,
      "teacherTimeLimitMs": 4000,
      "teacherExactEndgameEmpties": 14
    },
    "sampling": {
      "sampleStride": 200,
      "sampleResidue": 0,
      "maxRootsPerBucket": 500,
      "holdoutMod": 10,
      "holdoutResidue": 0,
      "targetMode": "root-mean",
      "rootWeighting": "uniform",
      "exactRootWeightScale": 1,
      "excludedFeatureKeys": []
    },
    "scanSummary": {
      "scannedSamples": 8539654,
      "eligibleRoots": 499801,
      "acceptedRoots": 2500,
      "skipped": {
        "rootRange": 7645259,
        "noMoves": 0,
        "singleMove": 9472,
        "stride": 497301,
        "bucketFull": 385122,
        "incomplete": 0,
        "timeout": 0,
        "depthShort": 0,
        "other": 0
      }
    },
    "createdAt": "2026-03-28T06:46:42.296Z",
    "adoptedFromProfilePath": "tools/evaluator-training/out/stage44_candidateH2_edgePattern125_cornerPattern125_11_12.json",
    "candidateAlias": "candidateH2",
    "selectedFromTuningSummaryPath": "benchmarks/stage43_top_pair_search_decision_summary_20260330.json",
    "priorActiveProfileBackupPath": "tools/evaluator-training/out/stage44_candidateF_before_candidateH2.json",
    "activeAdoption": {
      "candidateAlias": "candidateH2",
      "adoptedAt": "2026-03-30T16:54:58+09:00",
      "priorActiveProfileName": "stage41-candidateF-cornerPattern125-11-12",
      "priorActiveProfileBackupPath": "tools/evaluator-training/out/stage44_candidateF_before_candidateH2.json",
      "selectedFromBenchmarkSummaryPath": "benchmarks/stage44_candidateH2_current_apples_to_apples_24seed_20260330.json"
    },
    "localSearch": {
      "baseProfileName": "stage41-candidateF-cornerPattern125-11-12",
      "derivedFromProfilePath": "tools/evaluator-training/out/trained-move-ordering-profile.json",
      "actionChain": [
        {
          "label": "edgePattern@11-12=x1.25",
          "type": "scale",
          "featureKey": "edgePattern",
          "range": {
            "key": "11-12",
            "minEmpties": 11,
            "maxEmpties": 12
          },
          "scale": 1.25
        },
        {
          "label": "cornerPattern@11-12=x1.25",
          "type": "scale",
          "featureKey": "cornerPattern",
          "range": {
            "key": "11-12",
            "minEmpties": 11,
            "maxEmpties": 12
          },
          "scale": 1.25
        }
      ]
    },
    "selectedFromSmallValidationPath": "benchmarks/stage43_candidateH2_vs_candidateF_seed1_4_fullsuite_validation_20260330.json",
    "selectedFromBenchmarkSummaryPath": "benchmarks/stage44_candidateH2_current_apples_to_apples_24seed_20260330.json"
  },
  "featureKeys": [
    "mobility",
    "corners",
    "cornerAdjacency",
    "edgePattern",
    "cornerPattern",
    "discDifferential",
    "parity"
  ],
  "trainedBuckets": [
    {
      "key": "child-11-12",
      "minEmpties": 11,
      "maxEmpties": 12,
      "weights": {
        "mobility": 0,
        "corners": 6.411028,
        "cornerAdjacency": -28.093532,
        "edgePattern": -183.444529,
        "cornerPattern": 461.787356,
        "discDifferential": 0,
        "parity": 2.261603
      }
    },
    {
      "key": "child-15-16",
      "minEmpties": 15,
      "maxEmpties": 16,
      "weights": {
        "mobility": 30.294982,
        "corners": -3.826455,
        "cornerAdjacency": -1.419264,
        "edgePattern": -28.068467,
        "cornerPattern": 87.712837,
        "discDifferential": 8.814233,
        "parity": 0
      }
    },
    {
      "key": "child-17-18",
      "minEmpties": 17,
      "maxEmpties": 18,
      "weights": {
        "mobility": 28.839259,
        "corners": -0.772686,
        "cornerAdjacency": 2.923797,
        "edgePattern": -46.615311,
        "cornerPattern": 115.962661,
        "discDifferential": 5.858417,
        "parity": 0
      }
    }
  ]
});
const GENERATED_TUPLE_RESIDUAL_PROFILE = Object.freeze({
  "version": 1,
  "name": "top24-retrain-retrained-calibrated",
  "description": "top24-retrain retrained tuple residual profile (bucket bias recentered)",
  "stage": {
    "number": 38,
    "tag": "stage38",
    "file": "stage-info.json",
    "label": "Stage 38",
    "updatedAt": "2026-04-02T09:06:54+09:00",
    "kind": "tuple-residual-profile"
  },
  "source": {
    "inputFiles": [
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000000.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000001.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000002.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000003.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000004.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000005.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000006.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000007.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000008.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000009.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000010.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000011.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000012.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000013.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000014.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000015.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000016.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000017.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000018.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000019.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000020.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000021.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000022.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000023.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000024.txt",
      "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\Egaroucid_Train_Data\\0001_egaroucid_7_5_1_lv17\\0000025.txt"
    ],
    "evaluationProfileName": "trained-phase-linear-v1",
    "evaluationProfilePath": "C:\\Downloads\\othello-a11y-ai\\tools\\evaluator-training\\out\\trained-evaluation-profile.json",
    "layoutName": "orthogonal-adjacent-pairs-outer2-v1-patched",
    "phaseBuckets": [
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6
      }
    ],
    "targetScale": 3000,
    "holdoutMod": 10,
    "holdoutResidue": 0,
    "sampleStride": 4,
    "sampleResidue": 0,
    "epochs": 1,
    "learningRate": 0.05,
    "biasLearningRate": 0.05,
    "regularization": 0.0005,
    "gradientClip": 90000,
    "minVisits": 32,
    "seenSamples": 25514097,
    "selectedTrainSamples": 2700351,
    "seedProfileName": "top24-retrain-seed-patch"
  },
  "diagnostics": {
    "layout": {
      "name": "orthogonal-adjacent-pairs-outer2-v1-patched",
      "tupleCount": 24,
      "maxTupleLength": 2,
      "totalTableSize": 216
    },
    "training": {
      "scannedSamples": 25514097,
      "selectedTrainSamples": 2700351,
      "outsideBucketSamples": 12014097,
      "holdoutSamples": 1350214,
      "strideSkippedSamples": 9449435,
      "epochSummaries": [
        {
          "epoch": 1,
          "scannedSamples": 25514097,
          "outsideBucketSamples": 12014097,
          "holdoutSamples": 1350214,
          "strideSkippedSamples": 9449435,
          "selectedTrainSamples": 2700351,
          "trainResidual": {
            "count": 2700351,
            "mae": 19902.50853923201,
            "rmse": 25370.75362590227,
            "meanResidual": 45.029553110959135,
            "stdDevResidual": 25370.7136652791,
            "maxAbsResidual": 226634.50196110614,
            "maeInStones": 6.634169513077337,
            "rmseInStones": 8.456917875300757,
            "meanResidualInStones": 0.015009851036986379,
            "stdDevResidualInStones": 8.456904555093034,
            "maxAbsResidualInStones": 75.54483398703537
          }
        }
      ]
    },
    "bucketTrainingSummary": [
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "selectedTrainUpdates": 800207,
        "holdoutSamples": 400407,
        "strideSkippedSamples": 2799386
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "selectedTrainUpdates": 701041,
        "holdoutSamples": 349699,
        "strideSkippedSamples": 2449260
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "selectedTrainUpdates": 599280,
        "holdoutSamples": 299578,
        "strideSkippedSamples": 2101142
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "selectedTrainUpdates": 599823,
        "holdoutSamples": 300530,
        "strideSkippedSamples": 2099647
      }
    ],
    "weightStatsByBucket": [
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "totalWeights": 216,
        "visitedWeights": 216,
        "retainedWeights": 216,
        "nonZeroCount": 216,
        "meanAbsWeight": 675.835013625933,
        "maxAbsWeight": 2088.1965598192014,
        "bias": 571.9446517682293,
        "absBias": 571.9446517682293,
        "biasVisitCount": 800207,
        "retainedBias": true
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "totalWeights": 216,
        "visitedWeights": 216,
        "retainedWeights": 216,
        "nonZeroCount": 216,
        "meanAbsWeight": 591.5426914073186,
        "maxAbsWeight": 1759.2562826807998,
        "bias": 2052.084652662856,
        "absBias": 2052.084652662856,
        "biasVisitCount": 701041,
        "retainedBias": true
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "totalWeights": 216,
        "visitedWeights": 216,
        "retainedWeights": 216,
        "nonZeroCount": 216,
        "meanAbsWeight": 590.4504542560453,
        "maxAbsWeight": 2134.803925254778,
        "bias": 1474.7067689312485,
        "absBias": 1474.7067689312485,
        "biasVisitCount": 599280,
        "retainedBias": true
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "totalWeights": 216,
        "visitedWeights": 216,
        "retainedWeights": 216,
        "nonZeroCount": 216,
        "meanAbsWeight": 759.6075116885754,
        "maxAbsWeight": 3271.4297426168523,
        "bias": 2073.1125356037155,
        "absBias": 2073.1125356037155,
        "biasVisitCount": 599823,
        "retainedBias": true
      }
    ],
    "allSamples": {
      "base": {
        "count": 25514097,
        "mae": 18651.49042884018,
        "rmse": 24372.89129135579,
        "meanResidual": 10.341334753097474,
        "stdDevResidual": 24372.889097459134,
        "maxAbsResidual": 419087,
        "maeInStones": 6.21716347628006,
        "rmseInStones": 8.124297097118596,
        "meanResidualInStones": 0.0034471115843658245,
        "stdDevResidualInStones": 8.124296365819712,
        "maxAbsResidualInStones": 139.69566666666665
      },
      "candidate": {
        "count": 25514097,
        "mae": 18527.77912582993,
        "rmse": 24221.313868867248,
        "meanResidual": -449.42869735895414,
        "stdDevResidual": 24217.143914594286,
        "maxAbsResidual": 419087,
        "maeInStones": 6.175926375276643,
        "rmseInStones": 8.073771289622416,
        "meanResidualInStones": -0.14980956578631804,
        "stdDevResidualInStones": 8.072381304864763,
        "maxAbsResidualInStones": 139.69566666666665
      },
      "delta": {
        "mae": -123.71130301025187,
        "rmse": -151.57742248854265,
        "meanResidual": -459.77003211205164,
        "maeInStones": -0.04123710100341729,
        "rmseInStones": -0.05052580749618089,
        "meanResidualInStones": -0.15325667737068388
      }
    },
    "selectedAll": {
      "base": {
        "count": 13500000,
        "mae": 20300.247173777778,
        "rmse": 25874.427898569644,
        "meanResidual": 6.865125333333333,
        "stdDevResidual": 25874.4269878259,
        "maxAbsResidual": 236637,
        "maeInStones": 6.766749057925926,
        "rmseInStones": 8.624809299523214,
        "meanResidualInStones": 0.0022883751111111112,
        "stdDevResidualInStones": 8.624808995941967,
        "maxAbsResidualInStones": 78.879
      },
      "candidate": {
        "count": 13500000,
        "mae": 20066.441086,
        "rmse": 25604.00709480507,
        "meanResidual": -862.0694818518518,
        "stdDevResidual": 25589.49033332411,
        "maxAbsResidual": 242090,
        "maeInStones": 6.688813695333333,
        "rmseInStones": 8.534669031601691,
        "meanResidualInStones": -0.2873564939506173,
        "stdDevResidualInStones": 8.529830111108037,
        "maxAbsResidualInStones": 80.69666666666667
      },
      "delta": {
        "mae": -233.80608777777888,
        "rmse": -270.42080376457307,
        "meanResidual": -868.9346071851852,
        "maeInStones": -0.07793536259259295,
        "rmseInStones": -0.09014026792152435,
        "meanResidualInStones": -0.2896448690617284
      }
    },
    "holdoutSelected": {
      "base": {
        "count": 1350214,
        "mae": 20317.01745649208,
        "rmse": 25890.271563141137,
        "meanResidual": -14.074468195411987,
        "stdDevResidual": 25890.267737559992,
        "maxAbsResidual": 212675,
        "maeInStones": 6.772339152164027,
        "rmseInStones": 8.630090521047046,
        "meanResidualInStones": -0.004691489398470662,
        "stdDevResidualInStones": 8.63008924585333,
        "maxAbsResidualInStones": 70.89166666666667
      },
      "candidate": {
        "count": 1350214,
        "mae": 20083.69446769179,
        "rmse": 25623.53269415762,
        "meanResidual": -890.4859051972502,
        "stdDevResidual": 25608.0546426551,
        "maxAbsResidual": 206176,
        "maeInStones": 6.69456482256393,
        "rmseInStones": 8.541177564719208,
        "meanResidualInStones": -0.2968286350657501,
        "stdDevResidualInStones": 8.536018214218368,
        "maxAbsResidualInStones": 68.72533333333334
      },
      "delta": {
        "mae": -233.3229888002934,
        "rmse": -266.738868983517,
        "meanResidual": -876.4114370018382,
        "maeInStones": -0.0777743296000978,
        "rmseInStones": -0.08891295632783901,
        "meanResidualInStones": -0.2921371456672794
      }
    },
    "byBucket": [
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "selectedTrainUpdates": 800207,
        "weightStats": {
          "key": "midgame-c",
          "minEmpties": 20,
          "maxEmpties": 27,
          "totalWeights": 216,
          "visitedWeights": 216,
          "retainedWeights": 216,
          "nonZeroCount": 216,
          "meanAbsWeight": 675.835013625933,
          "maxAbsWeight": 2088.1965598192014,
          "bias": 571.9446517682293,
          "absBias": 571.9446517682293,
          "biasVisitCount": 800207,
          "retainedBias": true
        },
        "all": {
          "base": {
            "count": 4000000,
            "mae": 20937.25665425,
            "rmse": 26844.49929718129,
            "meanResidual": 11.54319625,
            "stdDevResidual": 26844.496815380746,
            "maxAbsResidual": 233660,
            "maeInStones": 6.9790855514166665,
            "rmseInStones": 8.948166432393764,
            "meanResidualInStones": 0.0038477320833333333,
            "stdDevResidualInStones": 8.948165605126915,
            "maxAbsResidualInStones": 77.88666666666667
          },
          "candidate": {
            "count": 4000000,
            "mae": 20702.065583,
            "rmse": 26567.235685081963,
            "meanResidual": -1551.110247,
            "stdDevResidual": 26521.91676610769,
            "maxAbsResidual": 237646,
            "maeInStones": 6.9006885276666665,
            "rmseInStones": 8.855745228360654,
            "meanResidualInStones": -0.5170367490000001,
            "stdDevResidualInStones": 8.840638922035897,
            "maxAbsResidualInStones": 79.21533333333333
          },
          "delta": {
            "mae": -235.19107124999937,
            "rmse": -277.26361209932656,
            "meanResidual": -1562.65344325,
            "maeInStones": -0.0783970237499998,
            "rmseInStones": -0.09242120403310886,
            "meanResidualInStones": -0.5208844810833333
          }
        },
        "holdout": {
          "base": {
            "count": 400407,
            "mae": 20927.38468608191,
            "rmse": 26817.790643269378,
            "meanResidual": 12.251209394441156,
            "stdDevResidual": 26817.787844900537,
            "maxAbsResidual": 212675,
            "maeInStones": 6.975794895360637,
            "rmseInStones": 8.93926354775646,
            "meanResidualInStones": 0.004083736464813719,
            "stdDevResidualInStones": 8.939262614966845,
            "maxAbsResidualInStones": 70.89166666666667
          },
          "candidate": {
            "count": 400407,
            "mae": 20688.592567063013,
            "rmse": 26538.691056141026,
            "meanResidual": -1557.8211170134389,
            "stdDevResidual": 26492.92955376371,
            "maxAbsResidual": 206176,
            "maeInStones": 6.8961975223543375,
            "rmseInStones": 8.846230352047009,
            "meanResidualInStones": -0.5192737056711463,
            "stdDevResidualInStones": 8.830976517921238,
            "maxAbsResidualInStones": 68.72533333333334
          },
          "delta": {
            "mae": -238.7921190188972,
            "rmse": -279.09958712835214,
            "meanResidual": -1570.07232640788,
            "maeInStones": -0.07959737300629907,
            "rmseInStones": -0.09303319570945072,
            "meanResidualInStones": -0.52335744213596
          }
        }
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "selectedTrainUpdates": 701041,
        "weightStats": {
          "key": "late-a",
          "minEmpties": 13,
          "maxEmpties": 19,
          "totalWeights": 216,
          "visitedWeights": 216,
          "retainedWeights": 216,
          "nonZeroCount": 216,
          "meanAbsWeight": 591.5426914073186,
          "maxAbsWeight": 1759.2562826807998,
          "bias": 2052.084652662856,
          "absBias": 2052.084652662856,
          "biasVisitCount": 701041,
          "retainedBias": true
        },
        "all": {
          "base": {
            "count": 3500000,
            "mae": 21404.061378857143,
            "rmse": 27109.665833887568,
            "meanResidual": -1.5095165714285714,
            "stdDevResidual": 27109.665791861225,
            "maxAbsResidual": 236637,
            "maeInStones": 7.134687126285714,
            "rmseInStones": 9.036555277962522,
            "meanResidualInStones": -0.0005031721904761905,
            "stdDevResidualInStones": 9.036555263953742,
            "maxAbsResidualInStones": 78.879
          },
          "candidate": {
            "count": 3500000,
            "mae": 21160.546400285715,
            "rmse": 26837.811193110785,
            "meanResidual": 1154.3902071428572,
            "stdDevResidual": 26812.972473911115,
            "maxAbsResidual": 242090,
            "maeInStones": 7.053515466761905,
            "rmseInStones": 8.945937064370261,
            "meanResidualInStones": 0.38479673571428574,
            "stdDevResidualInStones": 8.937657491303705,
            "maxAbsResidualInStones": 80.69666666666667
          },
          "delta": {
            "mae": -243.5149785714275,
            "rmse": -271.8546407767826,
            "meanResidual": 1155.8997237142858,
            "maeInStones": -0.08117165952380917,
            "rmseInStones": -0.09061821359226087,
            "meanResidualInStones": 0.38529990790476193
          }
        },
        "holdout": {
          "base": {
            "count": 349699,
            "mae": 21429.874643622086,
            "rmse": 27155.606321734427,
            "meanResidual": -112.70411696916491,
            "stdDevResidual": 27155.37244235551,
            "maxAbsResidual": 180665,
            "maeInStones": 7.143291547874028,
            "rmseInStones": 9.051868773911476,
            "meanResidualInStones": -0.037568038989721636,
            "stdDevResidualInStones": 9.051790814118503,
            "maxAbsResidualInStones": 60.221666666666664
          },
          "candidate": {
            "count": 349699,
            "mae": 21176.97499849871,
            "rmse": 26875.067013821365,
            "meanResidual": 1048.990623364665,
            "stdDevResidual": 26854.58705080907,
            "maxAbsResidual": 183419,
            "maeInStones": 7.058991666166237,
            "rmseInStones": 8.958355671273788,
            "meanResidualInStones": 0.349663541121555,
            "stdDevResidualInStones": 8.951529016936357,
            "maxAbsResidualInStones": 61.13966666666666
          },
          "delta": {
            "mae": -252.8996451233761,
            "rmse": -280.53930791306266,
            "meanResidual": 1161.69474033383,
            "maeInStones": -0.08429988170779204,
            "rmseInStones": -0.09351310263768756,
            "meanResidualInStones": 0.3872315801112767
          }
        }
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "selectedTrainUpdates": 599280,
        "weightStats": {
          "key": "late-b",
          "minEmpties": 7,
          "maxEmpties": 12,
          "totalWeights": 216,
          "visitedWeights": 216,
          "retainedWeights": 216,
          "nonZeroCount": 216,
          "meanAbsWeight": 590.4504542560453,
          "maxAbsWeight": 2134.803925254778,
          "bias": 1474.7067689312485,
          "absBias": 1474.7067689312485,
          "biasVisitCount": 599280,
          "retainedBias": true
        },
        "all": {
          "base": {
            "count": 3000000,
            "mae": 20795.154942333334,
            "rmse": 26195.852283221207,
            "meanResidual": 5.325427,
            "stdDevResidual": 26195.851741910836,
            "maxAbsResidual": 163534,
            "maeInStones": 6.931718314111111,
            "rmseInStones": 8.731950761073735,
            "meanResidualInStones": 0.0017751423333333335,
            "stdDevResidualInStones": 8.731950580636946,
            "maxAbsResidualInStones": 54.51133333333333
          },
          "candidate": {
            "count": 3000000,
            "mae": 20544.86507633333,
            "rmse": 25914.482669552504,
            "meanResidual": 214.539007,
            "stdDevResidual": 25913.594599071206,
            "maxAbsResidual": 163903,
            "maeInStones": 6.848288358777777,
            "rmseInStones": 8.638160889850834,
            "meanResidualInStones": 0.07151300233333334,
            "stdDevResidualInStones": 8.637864866357068,
            "maxAbsResidualInStones": 54.63433333333333
          },
          "delta": {
            "mae": -250.2898660000028,
            "rmse": -281.3696136687031,
            "meanResidual": 209.21358,
            "maeInStones": -0.08342995533333426,
            "rmseInStones": -0.09378987122290103,
            "meanResidualInStones": 0.06973786
          }
        },
        "holdout": {
          "base": {
            "count": 299578,
            "mae": 20823.697678067147,
            "rmse": 26231.68139850309,
            "meanResidual": -13.41526080019227,
            "stdDevResidual": 26231.677968123782,
            "maxAbsResidual": 150779,
            "maeInStones": 6.941232559355716,
            "rmseInStones": 8.74389379950103,
            "meanResidualInStones": -0.00447175360006409,
            "stdDevResidualInStones": 8.743892656041261,
            "maxAbsResidualInStones": 50.25966666666667
          },
          "candidate": {
            "count": 299578,
            "mae": 20580.121714545126,
            "rmse": 25963.59185446901,
            "meanResidual": 187.5601446034088,
            "stdDevResidual": 25962.914381432718,
            "maxAbsResidual": 154095,
            "maeInStones": 6.860040571515042,
            "rmseInStones": 8.654530618156336,
            "meanResidualInStones": 0.06252004820113627,
            "stdDevResidualInStones": 8.654304793810907,
            "maxAbsResidualInStones": 51.365
          },
          "delta": {
            "mae": -243.57596352202017,
            "rmse": -268.08954403407915,
            "meanResidual": 200.97540540360106,
            "maeInStones": -0.08119198784067339,
            "rmseInStones": -0.08936318134469305,
            "meanResidualInStones": 0.06699180180120036
          }
        }
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "selectedTrainUpdates": 599823,
        "weightStats": {
          "key": "endgame",
          "minEmpties": 0,
          "maxEmpties": 6,
          "totalWeights": 216,
          "visitedWeights": 216,
          "retainedWeights": 216,
          "nonZeroCount": 216,
          "meanAbsWeight": 759.6075116885754,
          "maxAbsWeight": 3271.4297426168523,
          "bias": 2073.1125356037155,
          "absBias": 2073.1125356037155,
          "biasVisitCount": 599823,
          "retainedBias": true
        },
        "all": {
          "base": {
            "count": 3000000,
            "mae": 17668.210192,
            "rmse": 22543.407915311294,
            "meanResidual": 11.937811333333334,
            "stdDevResidual": 22543.404754490402,
            "maxAbsResidual": 131379,
            "maeInStones": 5.889403397333333,
            "rmseInStones": 7.5144693051037645,
            "meanResidualInStones": 0.003979270444444445,
            "stdDevResidualInStones": 7.514468251496801,
            "maxAbsResidualInStones": 43.793
          },
          "candidate": {
            "count": 3000000,
            "mae": 17464.061566333334,
            "rmse": 22295.277923722497,
            "meanResidual": -3372.4932543333334,
            "stdDevResidual": 22038.73197226882,
            "maxAbsResidual": 129339,
            "maeInStones": 5.821353855444444,
            "rmseInStones": 7.431759307907499,
            "meanResidualInStones": -1.1241644181111112,
            "stdDevResidualInStones": 7.346243990756273,
            "maxAbsResidualInStones": 43.113
          },
          "delta": {
            "mae": -204.14862566666488,
            "rmse": -248.12999158879757,
            "meanResidual": -3384.4310656666667,
            "maeInStones": -0.0680495418888883,
            "rmseInStones": -0.08270999719626586,
            "meanResidualInStones": -1.1281436885555556
          }
        },
        "holdout": {
          "base": {
            "count": 300530,
            "mae": 17703.798795461353,
            "rmse": 22568.349962006083,
            "meanResidual": 64.9599707183975,
            "stdDevResidual": 22568.256472527606,
            "maxAbsResidual": 121634,
            "maeInStones": 5.901266265153784,
            "rmseInStones": 7.522783320668695,
            "meanResidualInStones": 0.021653323572799168,
            "stdDevResidualInStones": 7.522752157509202,
            "maxAbsResidualInStones": 40.544666666666664
          },
          "candidate": {
            "count": 300530,
            "mae": 17510.76256946062,
            "rmse": 22338.83512401509,
            "meanResidual": -3332.7918044787543,
            "stdDevResidual": 22088.821912585776,
            "maxAbsResidual": 125202,
            "maeInStones": 5.8369208564868735,
            "rmseInStones": 7.446278374671697,
            "meanResidualInStones": -1.1109306014929181,
            "stdDevResidualInStones": 7.362940637528592,
            "maxAbsResidualInStones": 41.734
          },
          "delta": {
            "mae": -193.0362260007314,
            "rmse": -229.5148379909915,
            "meanResidual": -3397.751775197152,
            "maeInStones": -0.06434540866691046,
            "rmseInStones": -0.07650494599699717,
            "meanResidualInStones": -1.1325839250657173
          }
        }
      }
    ],
    "createdAt": "2026-04-03T08:58:14.592Z"
  },
  "calibration": {
    "version": 1,
    "mode": "corpus",
    "scope": "holdout-selected",
    "shrink": 1,
    "maxBiasStones": 1.5,
    "targetScale": 3000,
    "holdoutMod": 10,
    "holdoutResidue": 0,
    "sourceTupleProfileName": "top24-retrain-retrained",
    "sourceTupleProfileStage": {
      "number": 38,
      "tag": "stage38",
      "file": "stage-info.json",
      "label": "Stage 38",
      "updatedAt": "2026-04-02T09:06:54+09:00",
      "kind": "tuple-residual-profile"
    },
    "generatedAt": "2026-04-03T09:10:15.483Z",
    "outputProfileName": "top24-retrain-retrained-calibrated",
    "outputDescription": "top24-retrain retrained tuple residual profile (bucket bias recentered)",
    "bucketBiasAdjustments": [
      {
        "key": "midgame-c",
        "minEmpties": 20,
        "maxEmpties": 27,
        "previousBias": 571.944652,
        "deltaBias": 1557.8211170134389,
        "nextBias": 2129.765769013439
      },
      {
        "key": "late-a",
        "minEmpties": 13,
        "maxEmpties": 19,
        "previousBias": 2052.084653,
        "deltaBias": -1048.990623364665,
        "nextBias": 1003.0940296353349
      },
      {
        "key": "late-b",
        "minEmpties": 7,
        "maxEmpties": 12,
        "previousBias": 1474.706769,
        "deltaBias": -187.5601446034088,
        "nextBias": 1287.146624396591
      },
      {
        "key": "endgame",
        "minEmpties": 0,
        "maxEmpties": 6,
        "previousBias": 2073.112536,
        "deltaBias": 3332.7918044787543,
        "nextBias": 5405.904340478754
      }
    ],
    "evaluationProfileName": "trained-phase-linear-v1",
    "verifiedDiagnostics": {
      "calibrationReference": "pre-calibration-vs-calibrated",
      "allSamples": {
        "base": {
          "count": 25514097,
          "mae": 18527.77912582993,
          "rmse": 24221.313868867248,
          "meanResidual": -449.42869735895414,
          "stdDevResidual": 24217.143914594286,
          "maxAbsResidual": 419087,
          "maeInStones": 6.175926375276643,
          "rmseInStones": 8.073771289622416,
          "meanResidualInStones": -0.14980956578631804,
          "stdDevResidualInStones": 8.072381304864763,
          "maxAbsResidualInStones": 139.69566666666665
        },
        "candidate": {
          "count": 25514097,
          "mae": 18503.176321192164,
          "rmse": 24182.040672448864,
          "meanResidual": 20.72356160596238,
          "stdDevResidual": 24182.031792592727,
          "maxAbsResidual": 419087,
          "maeInStones": 6.167725440397388,
          "rmseInStones": 8.060680224149621,
          "meanResidualInStones": 0.006907853868654127,
          "stdDevResidualInStones": 8.060677264197576,
          "maxAbsResidualInStones": 139.69566666666665
        },
        "delta": {
          "mae": -24.602804637765075,
          "rmse": -39.27319641838403,
          "meanResidual": 470.15225896491654,
          "maeInStones": -0.008200934879255025,
          "rmseInStones": -0.013091065472794677,
          "meanResidualInStones": 0.15671741965497218
        }
      },
      "selectedAll": {
        "base": {
          "count": 13500000,
          "mae": 20066.441086,
          "rmse": 25604.00709480507,
          "meanResidual": -862.0694818518518,
          "stdDevResidual": 25589.49033332411,
          "maxAbsResidual": 242090,
          "maeInStones": 6.688813695333333,
          "rmseInStones": 8.534669031601691,
          "meanResidualInStones": -0.2873564939506173,
          "stdDevResidualInStones": 8.529830111108037,
          "maxAbsResidualInStones": 80.69666666666667
        },
        "candidate": {
          "count": 13500000,
          "mae": 20019.94343088889,
          "rmse": 25533.75222231504,
          "meanResidual": 26.48683962962963,
          "stdDevResidual": 25533.738484560086,
          "maxAbsResidual": 241041,
          "maeInStones": 6.673314476962963,
          "rmseInStones": 8.51125074077168,
          "meanResidualInStones": 0.008828946543209875,
          "stdDevResidualInStones": 8.51124616152003,
          "maxAbsResidualInStones": 80.347
        },
        "delta": {
          "mae": -46.49765511111036,
          "rmse": -70.25487249002981,
          "meanResidual": 888.5563214814815,
          "maeInStones": -0.01549921837037012,
          "rmseInStones": -0.023418290830009937,
          "meanResidualInStones": 0.29618544049382717
        }
      },
      "holdoutSelected": {
        "base": {
          "count": 1350214,
          "mae": 20083.69446769179,
          "rmse": 25623.53269415762,
          "meanResidual": -890.4859051972502,
          "stdDevResidual": 25608.0546426551,
          "maxAbsResidual": 206176,
          "maeInStones": 6.69456482256393,
          "rmseInStones": 8.541177564719208,
          "meanResidualInStones": -0.2968286350657501,
          "stdDevResidualInStones": 8.536018214218368,
          "maxAbsResidualInStones": 68.72533333333334
        },
        "candidate": {
          "count": 1350214,
          "mae": 20039.263367880943,
          "rmse": 25555.442769951576,
          "meanResidual": -0.00018145271786546428,
          "stdDevResidual": 25555.442769951576,
          "maxAbsResidual": 207733,
          "maeInStones": 6.679754455960315,
          "rmseInStones": 8.518480923317192,
          "meanResidualInStones": -6.048423928848809e-8,
          "stdDevResidualInStones": 8.518480923317192,
          "maxAbsResidualInStones": 69.24433333333333
        },
        "delta": {
          "mae": -44.4310998108449,
          "rmse": -68.08992420604409,
          "meanResidual": 890.4857237445324,
          "maeInStones": -0.014810366603614965,
          "rmseInStones": -0.022696641402014696,
          "meanResidualInStones": 0.2968285745815108
        }
      },
      "byBucket": [
        {
          "key": "midgame-c",
          "minEmpties": 20,
          "maxEmpties": 27,
          "all": {
            "key": "midgame-c",
            "minEmpties": 20,
            "maxEmpties": 27,
            "base": {
              "count": 4000000,
              "mae": 20702.065583,
              "rmse": 26567.235685081963,
              "meanResidual": -1551.110247,
              "stdDevResidual": 26521.91676610769,
              "maxAbsResidual": 237646,
              "maeInStones": 6.9006885276666665,
              "rmseInStones": 8.855745228360654,
              "meanResidualInStones": -0.5170367490000001,
              "stdDevResidualInStones": 8.840638922035897,
              "maxAbsResidualInStones": 79.21533333333333
            },
            "candidate": {
              "count": 4000000,
              "mae": 20673.9655545,
              "rmse": 26521.917781907618,
              "meanResidual": 6.710843,
              "stdDevResidual": 26521.916932885033,
              "maxAbsResidual": 236088,
              "maeInStones": 6.8913218515,
              "rmseInStones": 8.840639260635873,
              "meanResidualInStones": 0.0022369476666666667,
              "stdDevResidualInStones": 8.840638977628345,
              "maxAbsResidualInStones": 78.696
            },
            "delta": {
              "mae": -28.100028500000917,
              "rmse": -45.3179031743457,
              "meanResidual": 1557.8210900000001,
              "maeInStones": -0.009366676166666973,
              "rmseInStones": -0.0151059677247819,
              "meanResidualInStones": 0.5192736966666667
            }
          },
          "holdout": {
            "key": "midgame-c",
            "minEmpties": 20,
            "maxEmpties": 27,
            "base": {
              "count": 400407,
              "mae": 20688.592567063013,
              "rmse": 26538.691056141026,
              "meanResidual": -1557.8211170134389,
              "stdDevResidual": 26492.92955376371,
              "maxAbsResidual": 206176,
              "maeInStones": 6.8961975223543375,
              "rmseInStones": 8.846230352047009,
              "meanResidualInStones": -0.5192737056711463,
              "stdDevResidualInStones": 8.830976517921238,
              "maxAbsResidualInStones": 68.72533333333334
            },
            "candidate": {
              "count": 400407,
              "mae": 20660.580489352084,
              "rmse": 26492.92908060871,
              "meanResidual": -0.0007792071567180394,
              "stdDevResidual": 26492.929080608697,
              "maxAbsResidual": 207733,
              "maeInStones": 6.886860163117361,
              "rmseInStones": 8.830976360202902,
              "meanResidualInStones": -2.597357189060132e-7,
              "stdDevResidualInStones": 8.830976360202898,
              "maxAbsResidualInStones": 69.24433333333333
            },
            "delta": {
              "mae": -28.01207771092959,
              "rmse": -45.76197553231759,
              "meanResidual": 1557.8203378062822,
              "maeInStones": -0.00933735923697653,
              "rmseInStones": -0.015253991844105865,
              "meanResidualInStones": 0.5192734459354273
            }
          }
        },
        {
          "key": "late-a",
          "minEmpties": 13,
          "maxEmpties": 19,
          "all": {
            "key": "late-a",
            "minEmpties": 13,
            "maxEmpties": 19,
            "base": {
              "count": 3500000,
              "mae": 21160.546400285715,
              "rmse": 26837.811193110785,
              "meanResidual": 1154.3902071428572,
              "stdDevResidual": 26812.972473911115,
              "maxAbsResidual": 242090,
              "maeInStones": 7.053515466761905,
              "rmseInStones": 8.945937064370261,
              "meanResidualInStones": 0.38479673571428574,
              "stdDevResidualInStones": 8.937657491303705,
              "maxAbsResidualInStones": 80.69666666666667
            },
            "candidate": {
              "count": 3500000,
              "mae": 21140.836896,
              "rmse": 26813.17966099449,
              "meanResidual": 105.39953828571429,
              "stdDevResidual": 26812.972503437544,
              "maxAbsResidual": 241041,
              "maeInStones": 7.046945632,
              "rmseInStones": 8.937726553664831,
              "meanResidualInStones": 0.03513317942857143,
              "stdDevResidualInStones": 8.937657501145848,
              "maxAbsResidualInStones": 80.347
            },
            "delta": {
              "mae": -19.7095042857145,
              "rmse": -24.631532116294693,
              "meanResidual": -1048.990668857143,
              "maeInStones": -0.006569834761904834,
              "rmseInStones": -0.008210510705431565,
              "meanResidualInStones": -0.3496635562857143
            }
          },
          "holdout": {
            "key": "late-a",
            "minEmpties": 13,
            "maxEmpties": 19,
            "base": {
              "count": 349699,
              "mae": 21176.97499849871,
              "rmse": 26875.067013821365,
              "meanResidual": 1048.990623364665,
              "stdDevResidual": 26854.58705080907,
              "maxAbsResidual": 183419,
              "maeInStones": 7.058991666166237,
              "rmseInStones": 8.958355671273788,
              "meanResidualInStones": 0.349663541121555,
              "stdDevResidualInStones": 8.951529016936357,
              "maxAbsResidualInStones": 61.13966666666666
            },
            "candidate": {
              "count": 349699,
              "mae": 21161.193326260585,
              "rmse": 26854.5872368601,
              "meanResidual": 0.00015727811632289482,
              "stdDevResidual": 26854.5872368601,
              "maxAbsResidual": 182370,
              "maeInStones": 7.053731108753529,
              "rmseInStones": 8.951529078953367,
              "meanResidualInStones": 5.2426038774298276e-8,
              "stdDevResidualInStones": 8.951529078953367,
              "maxAbsResidualInStones": 60.79
            },
            "delta": {
              "mae": -15.781672238124884,
              "rmse": -20.47977696126327,
              "meanResidual": -1048.9904660865486,
              "maeInStones": -0.0052605574127082945,
              "rmseInStones": -0.00682659232042109,
              "meanResidualInStones": -0.3496634886955162
            }
          }
        },
        {
          "key": "late-b",
          "minEmpties": 7,
          "maxEmpties": 12,
          "all": {
            "key": "late-b",
            "minEmpties": 7,
            "maxEmpties": 12,
            "base": {
              "count": 3000000,
              "mae": 20544.86507633333,
              "rmse": 25914.482669552504,
              "meanResidual": 214.539007,
              "stdDevResidual": 25913.594599071206,
              "maxAbsResidual": 163903,
              "maeInStones": 6.848288358777777,
              "rmseInStones": 8.638160889850834,
              "meanResidualInStones": 0.07151300233333334,
              "stdDevResidualInStones": 8.637864866357068,
              "maxAbsResidualInStones": 54.63433333333333
            },
            "candidate": {
              "count": 3000000,
              "mae": 20543.498622333333,
              "rmse": 25913.608609764156,
              "meanResidual": 26.978479,
              "stdDevResidual": 25913.594566206244,
              "maxAbsResidual": 163715,
              "maeInStones": 6.847832874111111,
              "rmseInStones": 8.637869536588052,
              "meanResidualInStones": 0.008992826333333334,
              "stdDevResidualInStones": 8.637864855402082,
              "maxAbsResidualInStones": 54.571666666666665
            },
            "delta": {
              "mae": -1.3664539999990666,
              "rmse": -0.8740597883479495,
              "meanResidual": -187.560528,
              "maeInStones": -0.0004554846666663555,
              "rmseInStones": -0.00029135326278264986,
              "meanResidualInStones": -0.062520176
            }
          },
          "holdout": {
            "key": "late-b",
            "minEmpties": 7,
            "maxEmpties": 12,
            "base": {
              "count": 299578,
              "mae": 20580.121714545126,
              "rmse": 25963.59185446901,
              "meanResidual": 187.5601446034088,
              "stdDevResidual": 25962.914381432718,
              "maxAbsResidual": 154095,
              "maeInStones": 6.860040571515042,
              "rmseInStones": 8.654530618156336,
              "meanResidualInStones": 0.06252004820113627,
              "stdDevResidualInStones": 8.654304793810907,
              "maxAbsResidualInStones": 51.365
            },
            "candidate": {
              "count": 299578,
              "mae": 20579.01656329904,
              "rmse": 25962.914356352176,
              "meanResidual": 0.00046732403581037325,
              "stdDevResidual": 25962.914356352172,
              "maxAbsResidual": 153908,
              "maeInStones": 6.859672187766346,
              "rmseInStones": 8.654304785450725,
              "meanResidualInStones": 1.5577467860345774e-7,
              "stdDevResidualInStones": 8.654304785450725,
              "maxAbsResidualInStones": 51.30266666666667
            },
            "delta": {
              "mae": -1.105151246087189,
              "rmse": -0.677498116834613,
              "meanResidual": -187.55967727937298,
              "maeInStones": -0.00036838374869572967,
              "rmseInStones": -0.00022583270561153768,
              "meanResidualInStones": -0.06251989242645765
            }
          }
        },
        {
          "key": "endgame",
          "minEmpties": 0,
          "maxEmpties": 6,
          "all": {
            "key": "endgame",
            "minEmpties": 0,
            "maxEmpties": 6,
            "base": {
              "count": 3000000,
              "mae": 17464.061566333334,
              "rmse": 22295.277923722497,
              "meanResidual": -3372.4932543333334,
              "stdDevResidual": 22038.73197226882,
              "maxAbsResidual": 129339,
              "maeInStones": 5.821353855444444,
              "rmseInStones": 7.431759307907499,
              "meanResidualInStones": -1.1241644181111112,
              "stdDevResidualInStones": 7.346243990756273,
              "maxAbsResidualInStones": 43.113
            },
            "candidate": {
              "count": 3000000,
              "mae": 17316.649698666668,
              "rmse": 22038.767715149275,
              "meanResidual": -39.70161933333333,
              "stdDevResidual": 22038.731954986164,
              "maxAbsResidual": 126918,
              "maeInStones": 5.772216566222222,
              "rmseInStones": 7.346255905049758,
              "meanResidualInStones": -0.013233873111111112,
              "stdDevResidualInStones": 7.346243984995388,
              "maxAbsResidualInStones": 42.306
            },
            "delta": {
              "mae": -147.41186766666578,
              "rmse": -256.51020857322146,
              "meanResidual": 3332.791635,
              "maeInStones": -0.04913728922222193,
              "rmseInStones": -0.08550340285774048,
              "meanResidualInStones": 1.110930545
            }
          },
          "holdout": {
            "key": "endgame",
            "minEmpties": 0,
            "maxEmpties": 6,
            "base": {
              "count": 300530,
              "mae": 17510.76256946062,
              "rmse": 22338.83512401509,
              "meanResidual": -3332.7918044787543,
              "stdDevResidual": 22088.821912585776,
              "maxAbsResidual": 125202,
              "maeInStones": 5.8369208564868735,
              "rmseInStones": 7.446278374671697,
              "meanResidualInStones": -1.1109306014929181,
              "stdDevResidualInStones": 7.362940637528592,
              "maxAbsResidualInStones": 41.734
            },
            "candidate": {
              "count": 300530,
              "mae": 17367.9304162646,
              "rmse": 22088.822438762134,
              "meanResidual": -0.0004259142182144877,
              "stdDevResidual": 22088.82243876213,
              "maxAbsResidual": 121870,
              "maeInStones": 5.789310138754867,
              "rmseInStones": 7.362940812920711,
              "meanResidualInStones": -1.419714060714959e-7,
              "stdDevResidualInStones": 7.36294081292071,
              "maxAbsResidualInStones": 40.623333333333335
            },
            "delta": {
              "mae": -142.83215319602095,
              "rmse": -250.01268525295745,
              "meanResidual": 3332.791378564536,
              "maeInStones": -0.04761071773200699,
              "rmseInStones": -0.08333756175098582,
              "meanResidualInStones": 1.110930459521512
            }
          }
        }
      ],
      "createdAt": "2026-04-03T09:34:15.600Z"
    }
  },
  "featureEncoding": "ternary-side-to-move",
  "layout": {
    "version": 1,
    "name": "orthogonal-adjacent-pairs-outer2-v1-patched",
    "description": "바깥쪽 두 줄/두 칸(file/rank)의 인접 가로/세로 pair 56개로 만든 compact residual layout입니다. (patched)",
    "tupleCount": 24,
    "maxTupleLength": 2,
    "totalTableSize": 216,
    "tuples": [
      {
        "key": "A1-B1",
        "squares": [
          0,
          1
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B1-C1",
        "squares": [
          1,
          2
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "C1-D1",
        "squares": [
          2,
          3
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "E1-F1",
        "squares": [
          4,
          5
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "F1-G1",
        "squares": [
          5,
          6
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A2-B2",
        "squares": [
          8,
          9
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A7-B7",
        "squares": [
          48,
          49
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B8-C8",
        "squares": [
          57,
          58
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "C8-D8",
        "squares": [
          58,
          59
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "E8-F8",
        "squares": [
          60,
          61
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "F8-G8",
        "squares": [
          61,
          62
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G8-H8",
        "squares": [
          62,
          63
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A1-A2",
        "squares": [
          0,
          8
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A2-A3",
        "squares": [
          8,
          16
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A3-A4",
        "squares": [
          16,
          24
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A5-A6",
        "squares": [
          32,
          40
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "A6-A7",
        "squares": [
          40,
          48
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "B1-B2",
        "squares": [
          1,
          9
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "G7-G8",
        "squares": [
          54,
          62
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "H2-H3",
        "squares": [
          15,
          23
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "H3-H4",
        "squares": [
          23,
          31
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "H5-H6",
        "squares": [
          39,
          47
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "H6-H7",
        "squares": [
          47,
          55
        ],
        "length": 2,
        "tableSize": 9
      },
      {
        "key": "H7-H8",
        "squares": [
          55,
          63
        ],
        "length": 2,
        "tableSize": 9
      }
    ]
  },
  "trainedBuckets": [
    {
      "key": "midgame-c",
      "minEmpties": 20,
      "maxEmpties": 27,
      "scale": 1,
      "bias": 2129.765769013439,
      "tupleWeights": [
        [
          -83.950961,
          57.565514,
          333.953486,
          630.570167,
          -112.060006,
          -58.575559,
          -461.26922,
          -219.458235,
          -684.983787
        ],
        [
          -93.399067,
          -1645.309475,
          1461.123992,
          -1203.70121,
          264.077213,
          1041.83118,
          1181.451764,
          -451.058789,
          -912.74634
        ],
        [
          -265.079985,
          -438.16242,
          628.908415,
          -1443.414862,
          64.121596,
          -185.31884,
          1483.386094,
          493.022421,
          -537.616799
        ],
        [
          -181.083219,
          -1177.694081,
          1291.870168,
          -672.436125,
          -167.864424,
          143.419225,
          995.365237,
          271.857633,
          -618.341746
        ],
        [
          -201.323977,
          -1816.258187,
          2031.787903,
          -1302.311927,
          -75.739921,
          405.185989,
          1019.724991,
          236.973145,
          -423.964176
        ],
        [
          -346.16033,
          -77.19639,
          575.61683,
          -1536.876882,
          581.772656,
          51.127585,
          1213.676564,
          55.156498,
          -691.443551
        ],
        [
          -403.810176,
          994.374732,
          -361.625485,
          -2055.541476,
          211.257546,
          256.744504,
          1581.705354,
          699.84886,
          -528.867277
        ],
        [
          -90.109916,
          -1233.650312,
          1359.965716,
          -1984.41842,
          -282.985198,
          -189.293832,
          2088.19656,
          435.059771,
          -578.48798
        ],
        [
          -38.607714,
          -1233.838288,
          1141.26879,
          -905.229966,
          16.070659,
          -126.602758,
          1211.815712,
          189.050406,
          -638.738415
        ],
        [
          -131.870578,
          -1234.66366,
          1513.769123,
          -572.884723,
          166.475936,
          366.939533,
          704.874948,
          -321.607596,
          -428.207825
        ],
        [
          -42.990225,
          -1449.037085,
          1296.224314,
          -1424.591457,
          248.964779,
          -468.41652,
          1440.823473,
          1331.443246,
          -801.584333
        ],
        [
          -122.188263,
          815.476166,
          -459.838441,
          -17.679261,
          157.519604,
          -186.945727,
          393.662719,
          -657.835124,
          -410.245617
        ],
        [
          -119.44353,
          -60.974656,
          307.491294,
          716.295746,
          187.051765,
          -337.006994,
          -309.08812,
          -184.787398,
          -715.549822
        ],
        [
          -88.948826,
          -1370.031171,
          1429.12844,
          -1190.89037,
          302.748875,
          1011.824446,
          1183.252721,
          -798.239899,
          -760.366715
        ],
        [
          -58.136197,
          -452.403136,
          885.570491,
          -1258.304106,
          -32.575812,
          -178.489121,
          1742.42661,
          342.771131,
          -737.863438
        ],
        [
          -149.754964,
          -807.188213,
          1251.511113,
          -904.017395,
          170.021782,
          -29.652434,
          1028.982887,
          132.619266,
          -709.998184
        ],
        [
          -39.535504,
          -1832.638899,
          1859.088239,
          -1438.733047,
          559.103955,
          375.881735,
          1293.148144,
          491.842073,
          -1064.17702
        ],
        [
          -245.298381,
          -72.899513,
          308.728509,
          -1382.376419,
          464.432093,
          191.69622,
          888.443428,
          273.470649,
          -551.333888
        ],
        [
          -217.298901,
          -1517.254468,
          1320.274537,
          -320.02594,
          335.248763,
          434.577425,
          689.704252,
          191.863423,
          -913.348201
        ],
        [
          -79.18688,
          -1415.521018,
          1279.783999,
          -2087.08871,
          184.8404,
          193.661597,
          1951.083756,
          362.184061,
          -611.595213
        ],
        [
          -196.830017,
          -961.526438,
          1052.039389,
          -945.713989,
          -48.491875,
          -14.103415,
          1251.062936,
          210.758099,
          -583.303448
        ],
        [
          -173.307842,
          -1179.553262,
          1498.335669,
          -611.613907,
          -228.565032,
          419.806156,
          810.001445,
          -33.953822,
          -537.389635
        ],
        [
          -61.403182,
          -1716.700542,
          1356.15722,
          -1604.118763,
          187.053387,
          -371.281905,
          1549.079598,
          992.322892,
          -949.175876
        ],
        [
          -150.20738,
          853.111876,
          -7.031954,
          -516.237949,
          85.835392,
          -404.450025,
          873.193105,
          -734.176348,
          -827.419991
        ]
      ]
    },
    {
      "key": "late-a",
      "minEmpties": 13,
      "maxEmpties": 19,
      "scale": 1,
      "bias": 1003.0940296353349,
      "tupleWeights": [
        [
          -359.844059,
          207.233029,
          399.604018,
          1605.504367,
          -346.27563,
          205.30485,
          -672.524587,
          -561.611916,
          -216.282435
        ],
        [
          -209.129016,
          -1374.170333,
          1759.256283,
          -1088.642684,
          -22.934816,
          603.222932,
          1166.166076,
          -258.985821,
          -220.67921
        ],
        [
          -246.091956,
          -355.041798,
          539.783496,
          -1106.451799,
          -238.629633,
          -7.831471,
          1257.188823,
          681.971824,
          143.653537
        ],
        [
          -475.495091,
          -705.349519,
          808.835085,
          -465.223484,
          -324.810446,
          649.510115,
          827.650404,
          190.987068,
          184.689682
        ],
        [
          -309.677287,
          -1321.291525,
          1654.62688,
          -1183.505283,
          -240.698919,
          782.104706,
          1197.161099,
          438.000486,
          -25.682539
        ],
        [
          -128.893829,
          -315.055831,
          559.7902,
          -938.755775,
          -76.262208,
          -305.409983,
          743.927813,
          738.682921,
          -99.285
        ],
        [
          -591.770973,
          689.274254,
          251.509817,
          -1211.507956,
          -134.052874,
          -365.705907,
          1035.632429,
          775.157944,
          -5.854235
        ],
        [
          -306.442509,
          -1348.971834,
          1463.583205,
          -1511.612553,
          -141.684504,
          107.944297,
          1747.867754,
          571.218646,
          -114.527549
        ],
        [
          -391.659686,
          -554.046201,
          803.864766,
          -720.522015,
          -324.590109,
          128.09125,
          1091.835912,
          251.000582,
          201.551966
        ],
        [
          -410.258929,
          -1005.510984,
          1090.891042,
          -268.857661,
          -314.245541,
          696.922445,
          676.864148,
          -49.833779,
          183.467913
        ],
        [
          -166.784744,
          -1146.305715,
          1313.753514,
          -1450.701199,
          -52.823991,
          -24.558883,
          1687.885924,
          664.957182,
          -258.261644
        ],
        [
          -393.16265,
          1419.123009,
          -374.74849,
          190.602431,
          -258.173272,
          -848.343842,
          519.561095,
          387.334282,
          -362.902419
        ],
        [
          -384.525736,
          255.8567,
          377.414106,
          1505.858154,
          -405.622447,
          399.406095,
          -565.172777,
          -734.995658,
          -233.711375
        ],
        [
          -145.379061,
          -1428.701747,
          1720.864756,
          -1293.784468,
          -0.856894,
          641.295411,
          1267.369957,
          207.17797,
          -320.458603
        ],
        [
          -403.399293,
          -245.850524,
          569.90461,
          -1070.818727,
          -202.515951,
          -4.391052,
          1281.475758,
          510.109086,
          82.717274
        ],
        [
          -433.910424,
          -798.214064,
          903.279898,
          -944.579326,
          -131.94852,
          397.853646,
          1290.973448,
          232.285566,
          143.621693
        ],
        [
          -150.155298,
          -1417.901433,
          1506.125091,
          -1333.626402,
          42.862512,
          375.05549,
          1563.430055,
          70.764023,
          -239.453478
        ],
        [
          -155.251858,
          -159.624802,
          636.907141,
          -786.843228,
          13.507,
          -452.432301,
          698.473684,
          460.894027,
          -98.298287
        ],
        [
          -346.826308,
          -949.897489,
          637.829387,
          -196.005371,
          -150.108126,
          345.16748,
          684.026671,
          -176.460566,
          256.849698
        ],
        [
          -252.503998,
          -1360.654257,
          1296.686623,
          -1479.463472,
          80.143766,
          131.845477,
          1759.15426,
          337.676801,
          123.574648
        ],
        [
          -356.70169,
          -602.604858,
          874.299121,
          -649.250031,
          -443.658546,
          130.833946,
          954.631032,
          269.225996,
          233.560038
        ],
        [
          -256.394209,
          -1454.214439,
          1393.191017,
          -192.781762,
          -319.336677,
          307.611905,
          603.836076,
          229.866165,
          319.9845
        ],
        [
          -204.540771,
          -1170.891,
          1413.556891,
          -1549.379582,
          -52.595942,
          -78.238618,
          1724.865893,
          409.282483,
          -202.227309
        ],
        [
          -383.442646,
          1485.642369,
          -553.486578,
          -4.331237,
          -269.863286,
          -619.110444,
          709.284497,
          305.37588,
          -178.64459
        ]
      ]
    },
    {
      "key": "late-b",
      "minEmpties": 7,
      "maxEmpties": 12,
      "scale": 1,
      "bias": 1287.146624396591,
      "tupleWeights": [
        [
          -204.643521,
          60.363601,
          548.131574,
          1745.554124,
          -333.810909,
          721.882576,
          -536.341672,
          -902.088665,
          -369.249542
        ],
        [
          -24.811794,
          -1613.481251,
          2134.803925,
          -980.573816,
          -311.658088,
          286.23537,
          1190.170934,
          14.589869,
          -257.485147
        ],
        [
          -29.806179,
          -227.469352,
          354.318994,
          -858.715212,
          -762.930243,
          160.496706,
          1076.403418,
          395.324056,
          411.6297
        ],
        [
          -90.013859,
          -801.305962,
          1016.181157,
          -483.650302,
          -835.785792,
          314.179749,
          940.840152,
          198.727701,
          330.431223
        ],
        [
          -190.77372,
          -829.115887,
          1486.803639,
          -1341.303282,
          -622.443705,
          445.515272,
          1682.071666,
          137.985301,
          -79.806533
        ],
        [
          -228.642127,
          -183.843343,
          716.498306,
          317.586906,
          -404.209193,
          -747.160353,
          603.2537,
          425.927482,
          -81.004706
        ],
        [
          -403.974803,
          378.20723,
          543.936339,
          217.496299,
          -556.797608,
          -565.958294,
          1123.35425,
          157.557154,
          -103.690692
        ],
        [
          -174.451966,
          -1117.261031,
          1789.745452,
          -921.140373,
          -678.83571,
          79.993565,
          1393.173582,
          356.743627,
          -196.53779
        ],
        [
          -42.363087,
          -479.518746,
          1021.321259,
          -696.479129,
          -719.739967,
          2.626064,
          781.787959,
          291.93867,
          446.566916
        ],
        [
          -92.587187,
          -693.061689,
          1140.091317,
          -389.304186,
          -864.990142,
          135.42475,
          819.630466,
          28.018821,
          480.977137
        ],
        [
          -45.634452,
          -618.583887,
          1093.56489,
          -1490.198962,
          -347.753629,
          20.389776,
          1988.60328,
          54.130687,
          -42.321015
        ],
        [
          -468.825337,
          1907.357376,
          -536.148665,
          297.154375,
          -515.114527,
          -846.836932,
          602.945158,
          493.292118,
          -312.917647
        ],
        [
          -265.321879,
          115.732424,
          484.13032,
          1745.558604,
          -362.630921,
          762.776572,
          -683.918499,
          -836.801259,
          -353.528343
        ],
        [
          -41.267929,
          -1440.204577,
          1833.407773,
          -788.549847,
          -416.928246,
          364.779387,
          1137.258093,
          -7.509753,
          -54.016239
        ],
        [
          65.179944,
          -416.176623,
          618.376478,
          -646.935065,
          -911.764191,
          91.161317,
          1213.75373,
          251.049664,
          414.824586
        ],
        [
          195.81951,
          -550.252319,
          800.621708,
          -642.132691,
          -808.665426,
          17.892087,
          874.358965,
          320.633647,
          468.909488
        ],
        [
          -40.663818,
          -705.461696,
          1192.795421,
          -1254.939459,
          -424.641447,
          378.651672,
          1699.230831,
          138.830099,
          -247.121409
        ],
        [
          -225.976876,
          -164.484816,
          872.83819,
          483.042968,
          -472.487881,
          -923.892609,
          585.772281,
          494.234421,
          -93.161667
        ],
        [
          -196.44034,
          132.728035,
          679.531798,
          -400.293829,
          -430.51812,
          303.040707,
          950.798451,
          -595.811516,
          30.188583
        ],
        [
          109.439954,
          -1122.666529,
          1734.362907,
          -970.831092,
          -725.239164,
          -108.690143,
          1420.155019,
          371.759498,
          -52.050023
        ],
        [
          46.266309,
          -693.982779,
          948.413661,
          -582.232025,
          -789.814448,
          -7.095744,
          696.956605,
          303.799221,
          494.038478
        ],
        [
          -196.053399,
          -752.694235,
          1130.988289,
          -436.335607,
          -890.683621,
          375.094477,
          930.127274,
          -238.100864,
          424.79913
        ],
        [
          -55.716803,
          -684.279124,
          1111.354718,
          -1421.46702,
          -505.255583,
          -229.615444,
          2067.07104,
          150.787177,
          -143.565453
        ],
        [
          -385.082743,
          1764.706553,
          -275.185691,
          404.682995,
          -498.623005,
          -932.170952,
          537.581711,
          626.915774,
          -455.071566
        ]
      ]
    },
    {
      "key": "endgame",
      "minEmpties": 0,
      "maxEmpties": 6,
      "scale": 1,
      "bias": 5405.904340478754,
      "tupleWeights": [
        [
          -174.950245,
          -114.070023,
          365.448284,
          1990.218855,
          -543.638099,
          644.453908,
          -158.51691,
          19.928702,
          -575.02853
        ],
        [
          222.204295,
          -1425.047211,
          2509.376252,
          -37.630554,
          -636.780116,
          495.645383,
          1740.324054,
          -226.385616,
          -378.476048
        ],
        [
          1061.022937,
          -787.599238,
          1861.379121,
          -265.585252,
          -947.912621,
          -255.497619,
          1886.634432,
          254.581614,
          76.912161
        ],
        [
          808.424694,
          -246.896106,
          1808.028056,
          -659.084711,
          -1105.317266,
          357.126156,
          2114.7048,
          -40.328428,
          27.893459
        ],
        [
          764.15065,
          -59.263541,
          1650.12242,
          -483.940393,
          -906.991172,
          -437.218572,
          3271.429743,
          80.336767,
          -611.40063
        ],
        [
          493.727242,
          -631.308922,
          1515.846063,
          2029.544847,
          -542.449986,
          -553.7541,
          309.538142,
          455.555464,
          -359.140451
        ],
        [
          489.841497,
          -65.407436,
          1554.208058,
          2404.569132,
          -942.417732,
          -481.564567,
          1038.103989,
          123.655655,
          -561.050487
        ],
        [
          646.148503,
          -534.56989,
          3005.22869,
          -239.875016,
          -795.648599,
          196.414103,
          1715.59118,
          -235.163666,
          -576.879357
        ],
        [
          765.046176,
          -439.136495,
          1863.368509,
          62.987654,
          -961.671849,
          -224.011256,
          1550.557098,
          430.047626,
          128.601267
        ],
        [
          493.832761,
          14.653731,
          1788.060285,
          -770.869593,
          -988.50236,
          564.866358,
          1839.360869,
          -45.135093,
          98.013947
        ],
        [
          224.21108,
          -263.240489,
          1640.570391,
          -1145.554632,
          -574.995916,
          4.074335,
          2556.207482,
          615.872876,
          -425.739449
        ],
        [
          -43.168147,
          2068.22088,
          -70.87445,
          87.047151,
          -566.891596,
          25.298728,
          419.560978,
          650.894995,
          -543.771258
        ],
        [
          -165.005647,
          -24.257845,
          313.543903,
          1911.643916,
          -471.213317,
          763.418878,
          34.643534,
          -148.405997,
          -624.336299
        ],
        [
          32.590594,
          -1236.94888,
          2394.280558,
          -151.461767,
          -518.807362,
          426.66283,
          1674.223326,
          -67.88049,
          -454.590872
        ],
        [
          636.669842,
          -554.642586,
          1609.864844,
          -275.196508,
          -795.526999,
          -128.188515,
          1768.341815,
          92.305782,
          107.72432
        ],
        [
          792.532152,
          -185.843539,
          1600.234402,
          -945.866707,
          -1079.657004,
          289.13164,
          2087.712266,
          112.049673,
          132.452475
        ],
        [
          349.668294,
          64.5128,
          1589.438062,
          -1057.547253,
          -751.011399,
          -175.980829,
          2589.598851,
          337.148864,
          -537.631834
        ],
        [
          193.605724,
          -612.918143,
          1669.076576,
          1823.952988,
          -518.646829,
          -621.21989,
          731.836972,
          262.094428,
          -414.727128
        ],
        [
          594.885841,
          2197.324869,
          978.939195,
          -675.064352,
          -708.008905,
          207.380757,
          1715.065386,
          -502.411646,
          -385.180484
        ],
        [
          746.929053,
          -492.202783,
          3080.606708,
          60.408129,
          -944.05242,
          150.097911,
          1754.84035,
          -153.083925,
          -679.847253
        ],
        [
          852.115027,
          -688.691787,
          2420.543414,
          -24.694956,
          -1035.54008,
          -203.421719,
          1514.888552,
          149.791829,
          160.221837
        ],
        [
          705.378142,
          106.192816,
          1947.679188,
          -653.843215,
          -1057.003761,
          121.680584,
          1878.729172,
          -228.425957,
          95.398963
        ],
        [
          331.841699,
          -220.048468,
          1779.037334,
          -1001.412909,
          -567.578255,
          -239.776934,
          2740.117002,
          331.035121,
          -549.561005
        ],
        [
          74.515588,
          2073.412217,
          414.389973,
          220.697405,
          -562.114248,
          -236.435819,
          197.375122,
          610.210764,
          -606.59157
        ]
      ]
    }
  ]
});
const GENERATED_MPC_PROFILE = null;

export { GENERATED_EVALUATION_PROFILE, GENERATED_MOVE_ORDERING_PROFILE, GENERATED_TUPLE_RESIDUAL_PROFILE, GENERATED_MPC_PROFILE };
export default GENERATED_EVALUATION_PROFILE;
