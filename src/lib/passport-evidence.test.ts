import { describe, it, expect } from 'vitest';
import {
  factStatus,
  formatRecordDate,
  latestRecordDate,
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

describe('passport evidence presentation', () => {
  describe('factStatus', () => {
    it('reports unknown facts when the profile has no value', () => {
      expect(factStatus({ type: 'rfc', value: null }, [])).toEqual({
        label: 'Sin información disponible',
        source: null,
      });
    });

    it('reports registered-but-unverified facts when no identity record matches', () => {
      expect(factStatus(rfcFact, [])).toEqual({
        label: 'Registrado sin verificación en Opinio',
        source: null,
      });
    });

    it('reports verified facts with their source when an identity record matches', () => {
      expect(factStatus(rfcFact, [verifiedRfc])).toEqual({
        label: 'Verificado',
        source: 'SAT Cédula Fiscal Digital',
      });
    });

    it('matches a CLEE value against a prefixed INEGI identity record', () => {
      const denue: IdentityEvidenceRow = {
        type: 'denue',
        identifier: 'CLEE: 0901547891234001',
        status: 'verified',
        source: 'INEGI Directorio Estadístico Nacional de Unidades Económicas',
      };
      expect(factStatus({ type: 'denue', value: '0901547891234001' }, [denue])).toEqual({
        label: 'Verificado',
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
      expect(factStatus({ type: 'denue', value: '0901547891234001' }, [phone])).toEqual({
        label: 'Registrado sin verificación en Opinio',
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
      expect(factStatus({ type: 'domain', value: 'tienda' }, [otherDomain])).toEqual({
        label: 'Registrado sin verificación en Opinio',
        source: null,
      });
    });

    it('keeps verified facts honest when the record has no source name', () => {
      expect(factStatus(rfcFact, [{ ...verifiedRfc, source: '  ' }])).toEqual({
        label: 'Verificado',
        source: null,
      });
    });

    it('reports pending and rejected verification states instead of claiming verification', () => {
      expect(factStatus(rfcFact, [{ ...verifiedRfc, status: 'pending' }]).label).toBe(
        'Verificación pendiente'
      );
      expect(factStatus(rfcFact, [{ ...verifiedRfc, status: 'rejected' }]).label).toBe(
        'Verificación rechazada'
      );
    });

    it('does not claim verification for an unrecognized identity status', () => {
      expect(factStatus(rfcFact, [{ ...verifiedRfc, status: 'imported' }]).label).toBe(
        'Estado de verificación desconocido'
      );
    });
  });

  describe('verificationLevelLabel', () => {
    it.each([
      ['unverified', 'Sin verificar'],
      ['public_info', 'Información pública'],
      ['identity_verified', 'Identidad verificada'],
      ['connected_orders', 'Pedidos conectados'],
      ['transparent_coverage', 'Cobertura transparente'],
    ])('maps the stored level %s to readable text', (level, expected) => {
      expect(verificationLevelLabel(level)).toBe(expected);
    });

    it('does not invent a level when the stored value is missing or unknown', () => {
      expect(verificationLevelLabel(null)).toBe('Sin nivel de verificación registrado');
      expect(verificationLevelLabel('comercio_certificado')).toBe('Sin nivel de verificación registrado');
    });
  });

  describe('source freshness dates', () => {
    it('parses day-first source dates and ISO dates', () => {
      expect(formatRecordDate('15/03/2026')).toBe('15 de marzo de 2026');
      expect(formatRecordDate('2026-01-02')).toBe('2 de enero de 2026');
    });

    it('returns null instead of inventing a date for unparseable values', () => {
      expect(formatRecordDate('No disponible')).toBeNull();
      expect(formatRecordDate('')).toBeNull();
      expect(formatRecordDate('32/13/2026')).toBeNull();
    });

    it('picks the most recent recorded source date', () => {
      expect(
        latestRecordDate([
          { record_date: '02/01/2026' },
          { record_date: '15/03/2026' },
          { record_date: 'No disponible' },
        ])
      ).toBe('15/03/2026');
    });

    it('returns null when no source record carries a parseable date', () => {
      expect(latestRecordDate([])).toBeNull();
      expect(latestRecordDate([{ record_date: 'No disponible' }])).toBeNull();
    });
  });
});
