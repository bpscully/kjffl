
export const scoringRules = {
  tdRushing: {
    '0-5': 2,
    '6-10': 2.5,
    '11-15': 3,
    '16-20': 3.5,
    '21-30': 4,
    '31-40': 4.5,
    '41-50': 5,
    '51-75': 5.5,
    '76+': 6,
  },
  tdPassingReceiving: {
    '0-9': 2,
    '10-19': 2.5,
    '20-29': 3,
    '30-39': 3.5,
    '40-49': 4,
    '50-59': 4.5,
    '60-69': 5,
    '70-79': 5.5,
    '80+': 6,
  },
  kicking: {
    pat: 0.5,
    '0-25': 1,
    '26-30': 1.25,
    '31-35': 1.5,
    '36-40': 1.75,
    '41-45': 2,
    '46-50': 2.5,
    '51-55': 3,
    '56-60': 4,
    '61+': 6,
  },
  rushingGameTotal: {
    '100-149': 2,
    '150-199': 3,
    '200-249': 4,
    '250+': 6,
  },
  passingGameTotal: {
    '300-399': 2,
    '400-499': 3,
    '500-599': 4,
    '600+': 6,
  },
  receivingGameTotal: {
    '100-149': 2,
    '150-199': 3,
    '200-249': 4,
    '250+': 6,
  },
  defense: {
    safety: 3,
    holdMinus10: 3, // Win only
    td: 3.5,
    shutOut: 4,
  },
  returnSpecialTeams: {
    safety: 3,
    otherScores: 3, // PAT - 1.00
    punt: 3.5,
    kickoff: 4,
  },
  flexBonus: {
    '100': 1, // 30 min both
    '150': 2, // 40 min both
    '200': 3, // 50 min both
  },
  upsetSpecial: {
    beatSpread: 2,
    dogVictory: 4,
    plus10DogW: 6,
  },
  overUnder: {
    correctCall: 2,
    oneTeamMinus10: 3,
    oneTeamOver: 4,
  },
  playOffOnly: {
    pickOfTheWeek: {
      beatSpread: 2,
      dogW: 4,
    },
  },
  conversions: {
    pass: 1,
    rush: 1,
    receive: 1,
  },
  misc: {
    superbowlMvp: 4,
    victory: 4,
  },
};
