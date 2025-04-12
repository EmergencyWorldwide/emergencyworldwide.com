// Game Systems Module

// Game Systems Module
const REFUND_RATES = {
    BUILDINGS: 0.7, // 70% refund for buildings
    VEHICLES: 0.5  // 50% refund for vehicles
};

export class RefundSystem {
    static calculateRefund(type, originalCost) {
        const rate = type === 'building' ? REFUND_RATES.BUILDINGS : REFUND_RATES.VEHICLES;
        return Math.floor(originalCost * rate);
    }
}

// Season Pass System
export class SeasonPass {
    constructor() {
        this.currentSeason = 1;
        this.seasonProgress = 0;
        this.rewards = [];
        this.specialMissions = [];
        this.isActive = false;
        this.endDate = null;
    }

    activatePass(durationDays = 30) {
        this.isActive = true;
        this.endDate = new Date();
        this.endDate.setDate(this.endDate.getDate() + durationDays);
        this.initializeSeasonContent();
    }

    initializeSeasonContent() {
        this.specialMissions = [
            {
                id: 'S1_M1',
                title: 'Multi-Agency Response',
                description: 'Coordinate multiple emergency services for a major incident',
                reward: 1000,
                progressNeeded: 100
            },
            // Add more season-specific missions
        ];

        this.rewards = [
            {
                level: 1,
                type: 'currency',
                amount: 500,
                description: 'Season Bonus'
            },
            // Add more rewards
        ];
    }
}

// Recruitment System
export class RecruitmentSystem {
    constructor() {
        this.availableRecruits = [];
        this.hiredStaff = [];
        this.recruitmentCosts = {
            BASIC: 1000,
            EXPERIENCED: 2000,
            SPECIALIST: 3000
        };
    }

    generateRecruits() {
        const specialties = ['Medical', 'Fire', 'Police', 'SES'];
        const recruit = {
            id: Date.now(),
            name: this.generateName(),
            specialty: specialties[Math.floor(Math.random() * specialties.length)],
            experience: Math.floor(Math.random() * 10) + 1,
            cost: this.calculateRecruitCost()
        };
        this.availableRecruits.push(recruit);
        return recruit;
    }

    generateName() {
        const firstNames = ['John', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    }

    calculateRecruitCost() {
        return this.recruitmentCosts.BASIC;
    }

    hireRecruit(recruitId) {
        const recruit = this.availableRecruits.find(r => r.id === recruitId);
        if (recruit) {
            this.hiredStaff.push(recruit);
            this.availableRecruits = this.availableRecruits.filter(r => r.id !== recruitId);
            return recruit;
        }
        return null;
    }
}

// Training Facility Programs
export class TrainingProgram {
    constructor() {
        this.programs = [
            {
                id: 'BASIC_TRAINING',
                name: 'Basic Emergency Response',
                duration: 7, // days
                cost: 1000,
                skillIncrease: 1
            },
            {
                id: 'ADVANCED_MEDICAL',
                name: 'Advanced Medical Response',
                duration: 14,
                cost: 2000,
                skillIncrease: 2,
                specialty: 'Medical'
            },
            {
                id: 'FIRE_SPECIALIST',
                name: 'Fire Fighting Specialist',
                duration: 14,
                cost: 2000,
                skillIncrease: 2,
                specialty: 'Fire'
            },
            {
                id: 'POLICE_TACTICAL',
                name: 'Police Tactical Operations',
                duration: 14,
                cost: 2000,
                skillIncrease: 2,
                specialty: 'Police'
            },
            {
                id: 'SES_ADVANCED',
                name: 'Advanced SES Operations',
                duration: 14,
                cost: 2000,
                skillIncrease: 2,
                specialty: 'SES'
            }
        ];
        this.activeTraining = new Map(); // staffId -> program
    }

    startTraining(staffId, programId) {
        const program = this.programs.find(p => p.id === programId);
        if (program && !this.activeTraining.has(staffId)) {
            this.activeTraining.set(staffId, {
                program: program,
                startDate: new Date(),
                endDate: new Date(Date.now() + program.duration * 24 * 60 * 60 * 1000)
            });
            return true;
        }
        return false;
    }

    checkTrainingCompletion(staffId) {
        const training = this.activeTraining.get(staffId);
        if (training && new Date() >= training.endDate) {
            this.activeTraining.delete(staffId);
            return training.program;
        }
        return null;
    }
}

// Export all systems
const gameSystems = {
    RefundSystem,
    SeasonPass,
    RecruitmentSystem,
    TrainingProgram
};