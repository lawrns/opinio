/**
 * The buyer's four questions, answered from registered profile facts only.
 *
 * SEO-GEO-001 finding 1 (JEV-001): the answers lived in the page's FAQ
 * structured data but only the first question was visible on the page. This
 * builder is the single source for both the visible Q&A block and the FAQPage
 * JSON-LD, so they always match. Keep the wording truthful: missing data keeps
 * its honest empty state and the PROFECO disclaimer stays on every profile.
 */
export interface BuyerFaqInput {
  brandName: string;
  legalName: string | null;
  rfc: string | null;
  /** Evidence label for the registered RFC (factStatus(...).label). */
  rfcLabel: string;
  domain: string | null;
  /** verificationLevelLabel(business.verified_level). */
  verificationLabel: string;
  reviewsCount: number;
  averageRating: number | null;
  casesCount: number;
}

export interface BuyerFaqItem {
  question: string;
  answer: string;
}

const plural = (count: number, singular: string, pluralForm: string) =>
  count === 1 ? singular : pluralForm;

export function buildBuyerFaq(input: BuyerFaqInput): BuyerFaqItem[] {
  const {
    brandName,
    legalName,
    rfc,
    rfcLabel,
    domain,
    verificationLabel,
    reviewsCount,
    averageRating,
    casesCount,
  } = input;

  return [
    {
      question: `¿Es confiable comprar en ${brandName} en México?`,
      answer: `${brandName} cuenta con un perfil público en Opinio México. Estado del RFC: ${rfc ? `${rfc} (${rfcLabel})` : 'sin RFC publicado'}. Nivel de verificación registrado: ${verificationLabel}. ${reviewsCount > 0 ? `Tiene ${reviewsCount} opiniones publicadas con promedio de ${averageRating?.toFixed(1)}/5.` : 'Todavía no tiene opiniones publicadas.'} ${casesCount > 0 ? `Opinio tiene registrados ${casesCount} ${plural(casesCount, 'caso', 'casos')} de atención de compradores.` : 'Opinio no tiene casos de atención registrados.'}`,
    },
    {
      question: `¿Tiene quejas ${brandName} ante la PROFECO?`,
      answer: `${casesCount > 0 ? `Opinio registra ${casesCount} ${plural(casesCount, 'caso', 'casos')} de atención de compradores para ${brandName}.` : `Opinio no registra casos de atención de compradores para ${brandName}.`} Los registros de casos de Opinio no son expedientes confirmados ante la PROFECO. Consulta las fuentes públicas vinculadas en este pasaporte.`,
    },
    {
      question: `¿Cuál es el RFC y razón social de ${brandName}?`,
      answer: legalName
        ? `La razón social registrada de ${brandName} es "${legalName}"${rfc ? ` y su RFC es ${rfc}` : ''}.`
        : rfc
          ? `El RFC publicado para ${brandName} es ${rfc}. La razón social aún no está publicada en Opinio.`
          : `La razón social y el RFC de ${brandName} aún no están publicados en Opinio.`,
    },
    {
      question: `¿Cómo solicitar aclaraciones o reembolsos a ${brandName}?`,
      answer: `Para aclaraciones, los consumidores pueden comunicarse a través de sus canales oficiales ${domain ? `en ${domain}` : ''} o solicitar una mediación independiente a través de Opinio registrando su comprobante de pago.`,
    },
  ];
}
