import { describe, it, expect } from 'vitest';
import { buildBuyerFaq, type BuyerFaqInput } from './passport-buyer-faq';

const RICH: BuyerFaqInput = {
  brandName: 'Tienda Rica',
  legalName: 'Tienda Rica, S.A. de C.V.',
  rfc: 'TRC240101ABC',
  rfcLabel: 'Validado ante el SAT',
  domain: 'tiendarica.mx',
  verificationLabel: 'Identidad verificada',
  reviewsCount: 2,
  averageRating: 4.5,
  casesCount: 1,
};

const SPARSE: BuyerFaqInput = {
  brandName: 'Tienda Mínima',
  legalName: null,
  rfc: null,
  rfcLabel: 'Sin RFC registrado',
  domain: null,
  verificationLabel: 'Sin verificar',
  reviewsCount: 0,
  averageRating: null,
  casesCount: 0,
};

describe('buildBuyerFaq', () => {
  it('answers the four buyer questions the audit found in the structured data', () => {
    const faq = buildBuyerFaq(RICH);

    expect(faq).toHaveLength(4);
    expect(faq.map((item) => item.question)).toEqual([
      '¿Es confiable comprar en Tienda Rica en México?',
      '¿Tiene quejas Tienda Rica ante la PROFECO?',
      '¿Cuál es el RFC y razón social de Tienda Rica?',
      '¿Cómo solicitar aclaraciones o reembolsos a Tienda Rica?',
    ]);
  });

  it('uses the registered facts when the profile has data', () => {
    const faq = buildBuyerFaq(RICH);
    const [confiable, profeco, rfc, reembolsos] = faq;

    expect(confiable.answer).toContain('RFC: TRC240101ABC (Validado ante el SAT)');
    expect(confiable.answer).toContain('2 opiniones publicadas con promedio de 4.5/5');
    expect(confiable.answer).toContain('1 caso de atención de compradores');
    expect(profeco.answer).toContain('Opinio registra 1 caso de atención de compradores');
    expect(profeco.answer).toContain('no son expedientes confirmados ante la PROFECO');
    expect(rfc.answer).toContain('"Tienda Rica, S.A. de C.V."');
    expect(rfc.answer).toContain('su RFC es TRC240101ABC');
    expect(reembolsos.answer).toContain('en tiendarica.mx');
  });

  it('keeps honest empty states and disclaimers when data is missing', () => {
    const faq = buildBuyerFaq(SPARSE);
    const [confiable, profeco, rfc, reembolsos] = faq;

    expect(confiable.answer).toContain('sin RFC publicado');
    expect(confiable.answer).toContain('Todavía no tiene opiniones publicadas.');
    expect(confiable.answer).toContain('Opinio no tiene casos de atención registrados.');
    expect(profeco.answer).toContain('Opinio no registra casos de atención de compradores');
    expect(profeco.answer).toContain('no son expedientes confirmados ante la PROFECO');
    expect(rfc.answer).toBe(
      'La razón social y el RFC de Tienda Mínima aún no están publicados en Opinio.',
    );
    expect(reembolsos.answer).toContain('Registrando su comprobante de pago'.toLowerCase());
    expect(reembolsos.answer).not.toContain('undefined');
  });

  it('never invents a legal name or RFC that is not registered', () => {
    const partial = buildBuyerFaq({ ...SPARSE, legalName: 'Registrada, S.A. de C.V.' });
    expect(partial[2].answer).toBe(
      'La razón social registrada de Tienda Mínima es "Registrada, S.A. de C.V.".',
    );
    expect(partial[2].answer).not.toContain('RFC es');

    const rfcOnly = buildBuyerFaq({ ...SPARSE, rfc: 'RFC010203XYZ', rfcLabel: 'Registrado' });
    expect(rfcOnly[2].answer).toBe(
      'El RFC publicado para Tienda Mínima es RFC010203XYZ. La razón social aún no está publicada en Opinio.',
    );
  });

  it('pluralizes registered cases honestly', () => {
    const two = buildBuyerFaq({ ...RICH, casesCount: 2 });
    expect(two[0].answer).toContain('2 casos de atención de compradores');
    expect(two[1].answer).toContain('Opinio registra 2 casos');
  });
});
