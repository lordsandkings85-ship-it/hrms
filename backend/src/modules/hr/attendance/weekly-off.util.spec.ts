import {
  parseSaturdayOffRule,
  resolveSaturdayOffRule,
  resolveSaturdayWeeklyOff,
  isSaturdayOff,
  saturdayOffLabel,
} from './weekly-off.util';

describe('weekly-off.util', () => {
  // Sept 2026: Saturdays 5, 12, 19, 26 (12 = 2nd, 26 = 4th).
  const secondSat = new Date(2026, 8, 12);
  const fourthSat = new Date(2026, 8, 26);

  describe('parseSaturdayOffRule', () => {
    it('normalises known rules and treats anything else as inherit', () => {
      expect(parseSaturdayOffRule('fourth')).toBe('FOURTH');
      expect(parseSaturdayOffRule(' SECOND ')).toBe('SECOND');
      expect(parseSaturdayOffRule('NONE')).toBe('NONE');
      expect(parseSaturdayOffRule('')).toBeNull();
      expect(parseSaturdayOffRule(null)).toBeNull();
      expect(parseSaturdayOffRule('bogus')).toBeNull();
    });
  });

  describe('resolveSaturdayOffRule', () => {
    it('inherits the company 2nd Saturday when the employee has no rule', () => {
      expect(
        resolveSaturdayOffRule({ employeeRule: null, companySecondSatOff: true, date: secondSat }),
      ).toBe('SECOND');
      expect(
        resolveSaturdayOffRule({ employeeRule: null, companySecondSatOff: false, date: secondSat }),
      ).toBeNull();
    });

    it('uses the employee rule once its effective date is reached', () => {
      const effectiveFrom = new Date('2026-11-01T00:00:00.000Z');
      // October is before the switch -> company policy still applies.
      expect(
        resolveSaturdayOffRule({
          employeeRule: 'FOURTH',
          effectiveFrom,
          companySecondSatOff: true,
          date: new Date(2026, 9, 24),
        }),
      ).toBe('SECOND');
      // November is on/after the switch -> employee rule wins.
      expect(
        resolveSaturdayOffRule({
          employeeRule: 'FOURTH',
          effectiveFrom,
          companySecondSatOff: true,
          date: new Date(2026, 10, 28),
        }),
      ).toBe('FOURTH');
    });

    it('honours NONE with no effective date', () => {
      expect(
        resolveSaturdayOffRule({ employeeRule: 'NONE', companySecondSatOff: true, date: secondSat }),
      ).toBe('NONE');
    });
  });

  describe('isSaturdayOff', () => {
    it('matches the 2nd / 4th Saturday day-of-month windows only', () => {
      expect(isSaturdayOff(secondSat, 'SECOND')).toBe(true);
      expect(isSaturdayOff(fourthSat, 'SECOND')).toBe(false);
      expect(isSaturdayOff(fourthSat, 'FOURTH')).toBe(true);
      expect(isSaturdayOff(secondSat, 'FOURTH')).toBe(false);
      expect(isSaturdayOff(secondSat, 'NONE')).toBe(false);
      expect(isSaturdayOff(new Date(2026, 8, 5), 'SECOND')).toBe(false);
    });

    it('never treats a weekday as a Saturday off', () => {
      expect(isSaturdayOff(new Date(2026, 8, 11), 'SECOND')).toBe(false);
    });
  });

  describe('resolveSaturdayWeeklyOff', () => {
    it('applies to a 6-day week only', () => {
      const base = { date: secondSat, employeeRule: 'SECOND', companySecondSatOff: true };
      expect(resolveSaturdayWeeklyOff({ ...base, workingDaysPerWeek: 6 }).isOff).toBe(true);
      expect(resolveSaturdayWeeklyOff({ ...base, workingDaysPerWeek: 5 }).isOff).toBe(false);
      expect(resolveSaturdayWeeklyOff({ ...base, workingDaysPerWeek: 7 }).isOff).toBe(false);
    });
  });

  describe('saturdayOffLabel', () => {
    it('labels the rules for badges', () => {
      expect(saturdayOffLabel('SECOND')).toBe('2nd Saturday');
      expect(saturdayOffLabel('FOURTH')).toBe('4th Saturday');
      expect(saturdayOffLabel('NONE')).toBeNull();
      expect(saturdayOffLabel(null)).toBeNull();
    });
  });
});
