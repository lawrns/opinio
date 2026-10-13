import { describe, it, expect } from 'vitest';
import {
  factStatus,
  latestRecordDateValue,
  parseRecordDate,
  verificationLevelLabel,
  type IdentityEvidenceRow,
} from './passport-evidence';

const rfcFact = { type: 'rfc', value: 'CZE150414AB2' };
const verifiedRfc: IdentityEvidenceRow = {
  type: 'rfc',
  identifier: 'CZE150414AB2',
  status: 'verified',
  source: 'SAT Cédula Fiscal Digital',
};

describe('factStatus', () => {
  it('reports a missing status when the profile has no value', () => {
    expect(factStatus({ type: 'rfc', value: null }, [])).toMatchObject({ status: 'missing', source: null });
  });

  it('keeps a registered value unverified when no identity record matches', () => {
    expect(factStatus(rfcFact, [])).toMatchObject({ status: 'registered', source: null });
  });

  it('reports verified with the recorded source when a same-type identity record matches', () => {
    expect(factStatus(rfcFact, [verifiedRfc])).toMatchObject({
      status: 'verified',
      source: 'SAT Cédula Fiscal Digital',
    });
  });

  it('matches a CLEE value against its prefixed INEGI identity record', () => {
    const denue: IdentityEvidenceRow = {
      type: 'denue',
      identifier: 'CLEE: 0901547891234001',
      status: 'verified',
      source: 'INEGI Directorio Estadístico Nacional de Unidades Económicas',
    };
    expect(factStatus({ type: 'denue', value: '0901547891234001' }, [denue])).toMatchObject({
      status: 'verified',
      source: 'INEGI Directorio Estadístico Nacional de Unidades Económicas',
    });
  });

  it('does not match an unrelated identity type that merely shares the value', () => {
    const phone: IdentityEvidenceRow = {
      type: 'phone',
      identifier: '0901547891234001',
      status: 'verified',
      source: 'Verificación Telefónica Voz',
    };
    expect(factStatus({ type: 'denue', value: '0901547891234001' }, [phone])).toMatchObject({
      status: 'registered',
      source: null,
    });
  });

  it('does not match a different domain that merely contains the value', () => {
    const otherDomain: IdentityEvidenceRow = {
      type: 'domain',
      identifier: 'tienda.mx',
      status: 'verified',
      source: 'DNS TXT Opinio-Security Token',
    };
    expect(factStatus({ type: 'domain', value: 'tienda' }, [otherDomain])).toMatchObject({
      status: 'registered',
      source: null,
    });
  });

  it('keeps a verified status without inventing a source when the record has none', () => {
    expect(factStatus(rfcFact, [{ ...verifiedRfc, source: '  ' }])).toMatchObject({
      status: 'verified',
      source: null,
    });
  });

  it('surfaces pending, rejected and unrecognized record states instead of verified', () => {
    expect(factStatus(rfcFact, [{ ...verifiedRfc, status: 'pending' }]).status).toBe('pending');
    expect(factStatus(rfcFact, [{ ...verifiedRfc, status: 'rejected' }]).status).toBe('rejected');
    expect(factStatus(rfcFact, [{ ...verifiedRfc, status: 'imported' }]).status).toBe('unknown');
  });
});

describe('verificationLevelLabel', () => {
  it('does not present a missing or unrecognized stored level as a known level', () => {
    expect(verificationLevelLabel(null)).toBe(verificationLevelLabel('comercio_certificado'));
    expect(verificationLevelLabel(null)).not.toBe(verificationLevelLabel('public_info'));
  });
});

describe('source record dates', () => {
  it('parses day-first source dates into the right calendar day', () => {
    expect(parseRecordDate('15/03/2026')).toEqual(new Date(Date.UTC(2026, 2, 15)));
    expect(parseRecordDate('02/01/2026')).toEqual(new Date(Date.UTC(2026, 0, 2)));
  });

  it('parses ISO source dates', () => {
    expect(parseRecordDate('2026-01-02')).toEqual(new Date(Date.UTC(2026, 0, 2)));
  });

  it('returns null for impossible or unparseable values instead of guessing', () => {
    expect(parseRecordDate('32/13/2026')).toBeNull();
    expect(parseRecordDate('No disponible')).toBeNull();
    expect(parseRecordDate('')).toBeNull();
  });

  it('selects the most recent parseable record date value', () => {
    expect(
      latestRecordDateValue([
        { record_date: '02/01/2026' },
        { record_date: '15/03/2026' },
        { record_date: 'No disponible' },
      ])
    ).toBe('15/03/2026');
  });

  it('returns null when no record carries a parseable date', () => {
    expect(latestRecordDateValue([])).toBeNull();
    expect(latestRecordDateValue([{ record_date: 'No disponible' }])).toBeNull();
  });
});
