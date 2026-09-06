import { pool } from '../src/lib/db';
import { calculateOpinioScore, ReviewCalculationItem, ResolutionMetricsInput } from '../src/lib/scoring';

interface NaturalReview {
  rating: number;
  title: string;
  body: string;
  author_name: string;
  author_masked_contact: string;
  verification_level: 'confirmed_payment' | 'confirmed_store_order' | 'reviewed_proof' | 'unverified_experience';
  ageDays: number;
  product_name?: string;
  response?: string;
}

interface NaturalCase {
  case_number: string;
  customer_name: string;
  customer_contact: string;
  issue_category: string;
  customer_requested_remedy: string;
  status: string;
  is_consumer_confirmed: boolean;
  remedy_offered: string;
  resolution_summary: string;
  median_first_response_minutes: number;
  total_resolution_hours: number;
}

// -----------------------------------------------------------------------------
// 1. BARRI.MX (128 REVIEWS, TARGET ~4.8★)
// -----------------------------------------------------------------------------
function getBarriReviews(): NaturalReview[] {
  const shortReviews: Array<{ rating: number; title: string; body: string; author: string }> = [
    { rating: 5, title: 'Llegó calientito', body: 'Llegó en 20 min calientito 👍', author: 'Memo R.' },
    { rating: 5, title: 'Todo bien', body: 'Todo bien, buen servicio y atentos.', author: 'Paco Hdez' },
    { rating: 5, title: 'De volada', body: 'Llegaron en 25 minutos un domingo, de volada.', author: 'Sofi Cantú' },
    { rating: 5, title: 'Super recomendado', body: 'Super recomendado, 10/10 la verdad.', author: 'Mariana Rdz' },
    { rating: 5, title: 'Muy amables', body: 'Muy amables los repartidores y la comida llegó perfecta.', author: 'Carlos Garza' },
    { rating: 4, title: 'Buena comida', body: 'La comida rica, solo tardó un poquito más de lo que marcaba.', author: 'Dani M.' },
    { rating: 5, title: '10/10', body: '10/10, los mejores precios sin las comisiones abusivas.', author: 'Fer Morales' },
    { rating: 5, title: 'Excelente servicio', body: 'Excelente servicio, muy puntuales!!', author: 'Lupita V.' },
    { rating: 5, title: 'Al tiro', body: 'Todo al tiro, me llegó la comida sin derramar nada.', author: 'Chema Ortiz' },
    { rating: 5, title: 'Sin broncas', body: 'Pagué con tarjeta y pasó sin broncas a la primera.', author: 'Beto C.' },
    { rating: 4, title: 'Todo en orden', body: 'Todo en orden, solo me gustaría que hubiera más restaurantes en la zona sur.', author: 'Claudia B.' },
    { rating: 5, title: 'Muy práctico', body: 'Muy práctico rastrear el pedido directo en whats.', author: 'Toño Lozoya' },
    { rating: 5, title: 'Rápido y rico', body: 'Rápido y rico, excelente opción.', author: 'Vale Mtz' },
    { rating: 5, title: 'Riquísimo', body: 'Los tacos llegaron al 100, con salsas y limones completos.', author: 'Alex Terrazas' },
    { rating: 4, title: 'Buen servicio', body: 'Buen servicio, el repartidor fue muy educado.', author: 'Gaby Rdz' },
    { rating: 5, title: 'De diez', body: 'De diez la atención de soporte cuando pedí cambio de dirección.', author: 'Jorge L.' },
    { rating: 5, title: 'Muy bien empacado', body: 'Muy bien empacado y sellado el pedido.', author: 'Ana Karen G.' },
    { rating: 5, title: 'Puntualidad', body: 'Puntuales como siempre, gracias!!', author: 'Héctor Ch.' },
    { rating: 4, title: 'Buena opción local', body: 'Buena opción para apoyar a los negocios de aquí.', author: 'Paola S.' },
    { rating: 5, title: 'Confiable', body: 'Ya llevo 5 pedidos y ninguno me ha fallado.', author: 'Ricardo D.' },
    { rating: 5, title: 'Excelente atención', body: 'Excelente atención por whats, súper amables 👍', author: 'Eduardo P.' },
    { rating: 4, title: 'Rico pero tardó un poco', body: 'Llegó muy rico, nada más que tardaron 40 min por la lluvia.', author: 'Miriam T.' },
    { rating: 5, title: 'Sin rollos', body: 'Fácil de pedir y sin rollos.', author: 'Javier B.' },
    { rating: 5, title: 'Todo fresco', body: 'El sushi llegó fresco y en su punto.', author: 'Andrea L.' },
    { rating: 5, title: 'Muy recomendado', body: 'La neta hacen un parote para los fines de semana.', author: 'Luis Carlos F.' },
    { rating: 4, title: 'Bien', body: 'Todo bien, llegó caliente y completo.', author: 'Karla N.' },
    { rating: 5, title: 'Puntuales', body: '20 minutos exactos, ni en el drive thru tardan tan poco.', author: 'Rubén C.' },
    { rating: 5, title: 'Genial', body: 'Genial el link de rastreo en tiempo real.', author: 'Silvia S.' },
    { rating: 5, title: 'Súper bien', body: 'Súper bien, da gusto que no inflen los precios del menú.', author: 'Óscar T.' },
    { rating: 5, title: 'Muy buena comida', body: 'Muy buena comida y entrega impecable.', author: 'Diana Q.' },
    { rating: 4, title: 'Todo correcto', body: 'Todo correcto, el repartidor traía cambio exacto.', author: 'Arturo H.' },
    { rating: 5, title: 'Al cien', body: 'Al cien, tacos calientes y tortillas enteras.', author: 'Manuel M.' },
    { rating: 5, title: 'Rápido', body: 'Super rápido servicio un viernes en la noche.', author: 'Tania N.' },
    { rating: 5, title: 'Recomendadísimo', body: 'Recomendadísimo para comida en Cuauhtémoc y Delicias.', author: 'Jorge O.' },
    { rating: 4, title: 'Buena experiencia', body: 'Buena experiencia en general, volvería a pedir.', author: 'Verónica R.' },
    { rating: 5, title: 'Fabuloso', body: 'Las pizzas llegaron crujientes, excelente.', author: 'Armando Q.' },
    { rating: 5, title: 'Muy amables', body: 'El repartidor muy atento y educado.', author: 'Leticia T.' },
    { rating: 5, title: 'Sin quejas', body: 'Sin quejas, todo de maravilla.', author: 'Emilio B.' }
  ];

  const mediumReviews: Array<{ rating: number; title: string; body: string; author: string }> = [
    { rating: 5, title: 'Precios reales del restaurante', body: 'La verdad me gusta más pedir por aquí que por uber, los precios son los mismos que en el local y no te clavan tarifas raras de servicio.', author: 'Don Rodolfo C.' },
    { rating: 5, title: 'Rastreo por WhatsApp muy cómodo', body: 'Pedí sushi para la casa y lo mejor es que no tuve que descargar ninguna app pesada, el enlace de whats te muestra la moto en el mapa en vivo.', author: 'Mariana Treviño' },
    { rating: 5, title: 'Cuidan los paquetes', body: 'Pedí consomé y tacos de birria. El caldo llegó hirviendo y ni una sola gota derramada en la bolsa, la mochila térmica que traen se nota de calidad.', author: 'Carlos A. Garza' },
    { rating: 4, title: 'Buena comida de oficina', body: 'Hicimos pedido grande de hamburguesas para la oficina. Todo llegó caliente y bien etiquetado por nombre, solo sugeriría agregar propina sugerida en el cobro.', author: 'Ing. Sofía V.' },
    { rating: 5, title: 'Pizzas crujientes en Delicias', body: 'Pedimos 3 pizzas en Delicias y llegaron en media hora exactita. Pagué con transferencia bancaria y al segundo me llegó el comprobante al correo.', author: 'Valeria Q.' },
    { rating: 4, title: 'Resolvieron rápido un faltante', body: 'Se les olvidó un refresco en el restaurante, pero les mandé mensaje por whats y en 8 minutos me transfirieron de regreso los $35 pesos sin rodeos.', author: 'Alejandro Morales' },
    { rating: 5, title: 'Mucho mejor para el restaurante', body: 'Tenemos cafetería en Cuauhtémoc y antes era un caos tomar pedidos por chat suelto. Con el menú de Barri los clientes piden solos y nos ahorra horas.', author: 'Paulina Lozano' },
    { rating: 5, title: 'Sin cobros sorpresa', body: 'En otras plataformas un combo te lo inflan $70 pesos más. Aquí me costó exactamente lo mismo que ir al local y me ahorré la vuelta con el calorón.', author: 'Roberto Elizondo' },
    { rating: 5, title: 'Soporte humano en corto', body: 'Tenía dudas sobre una promoción y me contestó una persona real de Chihuahua en caliente, nada de bots que te mandan a menús infinitos.', author: 'Mónica Arrieta' },
    { rating: 5, title: 'Repartidores educados', body: 'Siempre que pido a la oficina en D1 los chavos repartidores vienen aseados, con cambio en efectivo y te saludan con mucha educación.', author: 'Fernando Cavazos' },
    { rating: 4, title: 'Excelente navegación web', body: 'La página móvil abre súper rápido en el celular y no se traba. Estaría genial poder dejar guardadas dos tarjetas distintas.', author: 'Daniela Montes' },
    { rating: 5, title: 'Cortes en su punto', body: 'Pedí arrachera con papas y llegó en su término de cocción, la carne suavecita y el empaque sellado con cinta de seguridad.', author: 'Claudia Marcela' },
    { rating: 5, title: 'Fácil para mis papás', body: 'Mis papás ya son mayores y se les complica usar apps gringas, pero con el link de Barri eligen lo que quieren y pagan fácil sin enredos.', author: 'Esteban Arredondo' },
    { rating: 5, title: 'Boneless deliciosos', body: 'Pedimos boneless y alitas para ver el partido el sábado. Llegaron antes del tiempo que marcaba y las salsas venían aparte como pedí.', author: 'Juan Pablo R.' },
    { rating: 4, title: 'Muy bien el servicio en San Felipe', body: 'Buen servicio en San Felipe, los repartidores conocen bien las calles y no te están llamando cinco veces para dar con la casa.', author: 'Natalia E.' },
    { rating: 5, title: 'Excelente opción nocturna', body: 'Pedimos tacos tarde saliendo del trabajo y en 25 minutos ya estábamos cenando, comida caliente y limones frescos.', author: 'Héctor Loya' },
    { rating: 5, title: 'Puntualidad en lluvia', body: 'Ayer estaba lloviendo fuerte en la Cantera y aún así el repartidor llegó con impermeable y la comida totalmente seca y caliente.', author: 'Adriana M.' },
    { rating: 4, title: 'Rico pero faltaban servilletas', body: 'La comida deliciosa y a tiempo, lo único que faltaron fueron servilletas pero los tacos venían de diez.', author: 'Tomás N.' },
    { rating: 5, title: 'Buena variedad de comida local', body: 'Tienen las taquerías y pizzerías de toda la vida que no encuentras en otras apps porque no les conviene pagar comisiones tan altas.', author: 'Jimena Ochoa' },
    { rating: 5, title: 'Pago fácil con tarjeta', body: 'Pagué con tarjeta Santander y no me mandó alertas de fraude ni bloqueos como en otras plataformas, súper fluido.', author: 'Samuel P.' },
    { rating: 5, title: 'Burritos calientes en Parral', body: 'Pedimos burritos de deshebrada y montados, el queso venía derretido en su punto y la entrega fue en menos de 20 min.', author: 'Diana Quintana' },
    { rating: 4, title: 'Muy buena comida casera', body: 'Tienen fonditas de comida casera muy ricas, excelente para comer sano en la oficina sin gastar una fortuna.', author: 'Rubén Ramos' },
    { rating: 5, title: 'Los mejores mariscos', body: 'Pedí aguachile y tostadas de camarón. El marisco fresco y frío como debe ser, con sus tostaditas intactas sin romperse.', author: 'Silvia Salinas' },
    { rating: 5, title: 'Atención al cliente de 10', body: 'Me equivoqué al poner el número exterior de mi casa, llamé y en el mismo instante le avisaron al repartidor sin retrasar la entrega.', author: 'Óscar Talamás' },
    { rating: 4, title: 'Buena experiencia', body: 'Todo bien con los pedidos del fin de semana, comida rica y precios accesibles sin tarifas escondidas.', author: 'Beatriz Urquiza' },
    { rating: 5, title: 'Súper práctico el menú web', body: 'Abres el menú en WhatsApp, seleccionas con un clic y pagas. Cero registros largos ni pedir códigos por SMS.', author: 'Fabián V.' },
    { rating: 5, title: 'Pollo asado con complementos completos', body: 'Pedimos paquete familiar de pollo asado. Traía todas las salsas, totopos, cebollitas y tortillas calientes.', author: 'Lorena W.' },
    { rating: 5, title: 'Excelente para taquerías locales', body: 'Nosotros como negocio de tacos empezamos a repartir con Barri y la verdad nos quitamos el dolor de cabeza de contratar motos propias.', author: 'Don Charly Taquero' },
    { rating: 4, title: 'Rápido pero el tráfico retrasó un poco', body: 'Todo muy rico, solo que en periférico había choque y tardó unos minutos más pero el repartidor avisó por mensaje.', author: 'Rodrigo Z.' },
    { rating: 5, title: 'Ensaladas frescas y bien cuidadas', body: 'Pedí bowl de pollo y ensalada, venía bien presentado, aderezos sellados y verduras crujientes sin maltratar.', author: 'Miriam Alvídrez' },
    { rating: 5, title: 'Muy buena plataforma en Juárez', body: 'Excelente que ya estén operando en Juárez, hacían falta opciones locales que de verdad apoyen a los restaurantes chiquitos.', author: 'Emilio Beltrán' },
    { rating: 4, title: 'Recomendable', body: 'La comida llegó caliente y el repartidor muy amable, lo recomiendo para cuando no tienes ganas de cocinar.', author: 'Norma Ceballos' },
    { rating: 5, title: 'Tortas ahogadas al cien', body: 'La salsa venía en bolsa sellada gruesa y el pan durito, todo en su punto exacto para armar en casa.', author: 'Hugo Duarte' },
    { rating: 5, title: 'Muy buena iniciativa local', body: 'Se nota que la plataforma está hecha pensando en la gente de aquí, rápida, sin vueltas y con buen trato de los chavos repartidores.', author: 'Natalia Escobedo' },
    { rating: 4, title: 'Todo en orden con la factura', body: 'Pedí factura para comprobar gastos de viáticos y me la timbraron sin problema al día siguiente.', author: 'César Fierro' },
    { rating: 5, title: 'Desayunos a tiempo', body: 'Pedí chilaquiles con huevo y café para desayunar antes de entrar a junta por Zoom. Llegó en 22 minutos calientito.', author: 'Gloria G.' },
    { rating: 5, title: 'Empaque ecológico', body: 'Me gustó que el restaurante y Barri usen bolsas de papel kraft y empaques biodegradables en lugar de tanto unicel.', author: 'Arturo Holguín' },
    { rating: 4, title: 'Buena app', body: 'Fácil de usar y buenas promociones entre semana en comida corrida.', author: 'Marisol Islas' },
    { rating: 5, title: 'Comida de domingo sin filas', body: 'Los domingos los restaurantes se llenan cañón, pedir por Barri nos salvó de esperar una hora parada con los niños.', author: 'David Jáquez' },
    { rating: 5, title: 'Gran servicio de delivery', body: 'Excelente servicio en comida china y sushi, salsas abundantes y galletas de la suerte incluidas.', author: 'Raquel Lara' },
    { rating: 4, title: 'Buen trato', body: 'El chavo de la moto muy educado, traía cambio de quinientos pesos sin hacer caras.', author: 'Manuel Medrano' },
    { rating: 5, title: 'Calidad constante', body: 'Pido casi diario en la oficina y la calidad del reparto siempre es constante, nada de comidas frías o aplastadas.', author: 'Tania Nevárez' },
    { rating: 5, title: 'Excelente soporte', body: 'Tuve un error al teclear mi número y soporte me corrigió el dato en menos de dos minutos por el chat.', author: 'Jorge Olivas' },
    { rating: 4, title: 'Buena experiencia', body: 'Comida rica, rápida y buenos precios. Muy conforme con el servicio.', author: 'Carmen Prieto' },
    { rating: 5, title: 'Hamburguesas con queso derretido', body: 'Pedí hamburguesa con tocino y papas gajo, venía humeando como si me la acabaran de servir en la mesa.', author: 'Armando Quezada' },
    { rating: 5, title: 'Fácil de pagar con CoDi/SPEI', body: 'Pagar con transferencia directa sin meter los números de tarjeta me da mucha más tranquilidad.', author: 'Verónica Rascón' },
    { rating: 4, title: 'Rápido', body: 'Llegó en buen tiempo y el paquete bien cuidado.', author: 'Ignacio Saenz' },
    { rating: 5, title: 'Recomendado para fines de semana', body: 'Para pedir comida el domingo con la familia no hay mejor opción en Chihuahua, súper recomendable.', author: 'Leticia Tarango' },
    { rating: 5, title: 'Costillas BBQ suaves y calientes', body: 'Las costillas venían recién salidas del ahumador, muy buen trabajo de los repartidores con las mochilas térmicas.', author: 'Paco Valenzuela' },
    { rating: 4, title: 'Buena atención', body: 'Comida en buen estado y entrega puntual en colonia Mirador.', author: 'Sofi H.' }
  ];

  const extraMedium: Array<{ rating: number; title: string; body: string; author: string }> = [
    { rating: 5, title: 'Excelente opción para comer rico', body: 'Pedí comida para llevar y me sorprendió lo rápido que llegó a la casa. Todo muy bien.', author: 'Gabriel F.' },
    { rating: 5, title: 'Todo en orden con mi pedido', body: 'Llegó completo con aderezos y salsas extras que pedí en las notas del menú.', author: 'Elena H.' },
    { rating: 5, title: 'Muy buen servicio en Chihuahua', body: 'Da gusto usar plataformas locales que funcionan bien y no te cobran de más.', author: 'Mauricio I.' },
    { rating: 4, title: 'Rápido y atento el repartidor', body: 'El chavo repartidor muy amable y traía cambio. La comida caliente.', author: 'Renata J.' },
    { rating: 5, title: 'Súper práctico', body: 'Pides directo en whats sin broncas ni registrar cuentas enredadas.', author: 'Héctor L.' },
    { rating: 5, title: 'Los tacos llegaron al 100', body: 'Tortillas calientes y carne suavecita, se agradece el cuidado del repartidor.', author: 'Adriana M.' },
    { rating: 4, title: 'Buena comida', body: 'Comida rica y a buen precio, llegó unos 5 minutos después pero todo bien.', author: 'Tomás N.' },
    { rating: 5, title: '10 de 10', body: '10 de 10 el servicio, muy recomendado para los que trabajamos en oficina.', author: 'Jimena O.' },
    { rating: 5, title: 'Puntualidad impecable', body: '22 minutos exactos de reloj, súper puntuales.', author: 'Samuel P.' },
    { rating: 4, title: 'Buen sabor y caliente', body: 'Llegó caliente y bien sellado con su cinta de seguridad.', author: 'Diana Q.' },
    { rating: 5, title: 'Muy confiable', body: 'Ya es mi app de cabecera para cenar los domingos.', author: 'Rubén R.' },
    { rating: 5, title: 'Excelente trato', body: 'El repartidor muy educado y respetuoso al entregar.', author: 'Silvia S.' },
    { rating: 4, title: 'Buena atención en el chat', body: 'Tuve una duda con mi comprobante y me atendieron rápido.', author: 'Óscar T.' },
    { rating: 5, title: 'De lujo', body: 'De lujo las hamburguesas y las papas bien crujientes.', author: 'Beatriz U.' },
    { rating: 5, title: 'Recomendado al 100', body: 'Recomendado al 100 para comida casera y antojitos.', author: 'Fabián V.' },
    { rating: 4, title: 'Todo bien', body: 'Llegó en buen estado la comida, satisfecho con la compra.', author: 'Lorena W.' },
    { rating: 5, title: 'Muy buena opción', body: 'Excelente menú y precios justos para todos.', author: 'Rodrigo Z.' },
    { rating: 5, title: 'Puntual y rico', body: 'Llegó a tiempo y con todo lo que pedí.', author: 'Miriam A.' },
    { rating: 5, title: 'Genial el servicio', body: 'Genial poder pagar con transferencia SPEI sin trabas.', author: 'Emilio B.' },
    { rating: 4, title: 'Buena comida local', body: 'Apoyando a los restaurantes de la ciudad.', author: 'Norma C.' },
    { rating: 5, title: 'Súper rápido', body: 'En menos de media hora ya estaba comiendo.', author: 'Hugo D.' },
    { rating: 5, title: 'Calidad de entrega', body: 'Cuidan mucho los paquetes para que no se aplasten.', author: 'Natalia E.' },
    { rating: 4, title: 'Todo en orden', body: 'Todo en orden con la entrega de hoy.', author: 'César F.' },
    { rating: 5, title: 'Excelente comida', body: 'Llegó calientita y con porciones generosas.', author: 'Gloria G.' },
    { rating: 5, title: 'Muy amables', body: 'Excelente trato del personal de reparto.', author: 'Arturo H.' },
    { rating: 4, title: 'Bien servido', body: 'Comida rica y entrega puntual.', author: 'Marisol I.' },
    { rating: 5, title: '10/10 la comida', body: '10/10 la birria y los burritos, riquísimos.', author: 'David J.' },
    { rating: 5, title: 'Súper recomendado', body: 'Para pedir comida en la oficina es la mejor opción.', author: 'Raquel L.' },
    { rating: 4, title: 'Buena experiencia', body: 'Todo correcto, volveré a pedir pronto.', author: 'Manuel M.' },
    { rating: 5, title: 'Rápido y calientito', body: 'Llegó muy rápido y la comida echando humo.', author: 'Tania N.' }
  ];

  const longReviews: Array<{ rating: number; title: string; body: string; author: string }> = [
    { rating: 5, title: 'Dejamos las comisiones del 30%', body: 'Tengo taquería en San Felipe. Estábamos ahogados con las comisiones abusivas de Uber y Rappi que se llevaban el 30% de cada orden. Con Barri mantenemos nuestros precios reales de mostrador y la ganancia se queda en la cocina.', author: 'Don Rodolfo Canseco' },
    { rating: 5, title: 'Nos salvó en la cocina con los pedidos', body: 'Manejamos una pizzería en Delicias con delivery propio y externo. Integrar el menú web de Barri nos ordenó la toma de comandas, los clientes reciben su confirmación en whats y los repartidores salen con ruta clara sin perder tiempo.', author: 'Marco Antonio S.' },
    { rating: 5, title: 'Excelente para pedidos corporativos', body: 'En el despacho organizamos juntas con clientes y pedimos charolas de comida ejecutiva para 15 personas. La puntualidad de Barri y el cuidado con los paquetes calientes nos ha hecho clientes frecuentes.', author: 'Lic. Treviño' },
    { rating: 4, title: 'Gran servicio local con detalles por pulir', body: 'Llevo 3 meses usando Barri para pedir en restaurantes de Chihuahua. El servicio es excelente y mucho más rápido que las apps grandes. Lo único que mejoraría es ampliar la cobertura hacia la salida a Aldama pero en zona centro y norte están de 10.', author: 'Ing. Fernando M.' },
    { rating: 5, title: 'Comida fresca y choferes con buena vibra', body: 'En nuestra oficina en Distrito Uno pedimos casi todos los viernes de diferentes restaurantes. Los muchachos repartidores son súper atentos, traen cambio y nunca hemos tenido un solo pedido con caldos derramados o comida batida.', author: 'Karla Baeza' },
    { rating: 5, title: 'La mejor decisión para nuestra cafetería', body: 'Antes tomábamos pedidos por mensajes de texto normales y era un dolor de cabeza confirmar depósitos y ubicaciones. Con la tienda de Barri el cliente arma su comanda, paga y a nosotros nos llega directo a cocina.', author: 'Café de la O' },
    { rating: 4, title: 'Muy buena experiencia con soporte honesto', body: 'Pedimos comida para un cumpleaños y el restaurante olvidó un paquete de complementos. Hablé al número de ayuda y en menos de 10 min ya me habían depositado el reembolso sin hacer preguntas pesadas. Se agradece la honestidad.', author: 'Beto Villarreal' },
    { rating: 5, title: 'Comida calientita en invierno', body: 'En temporada de frío pedir caldos o menudo a domicilio siempre daba desconfianza de que llegara tibio. Con Barri pedí pozole un domingo a 2 grados y llegó echando humo a la mesa. Mis respetos.', author: 'Doña Tere' },
    { rating: 5, title: 'Apoyo real al comercio de Chihuahua', body: 'Como consumidor prefiero que el dinero se quede con los restaurantes y los repartidores de aquí en lugar de que se vaya en comisiones a empresas extranjeras. Barri hace justo eso con una plataforma moderna.', author: 'Alonso Terrazas' },
    { rating: 5, title: 'Logística impecable en horas pico', body: 'Los viernes en la noche la mayoría de las plataformas colapsan y te marcan 80 minutos de espera. Con Barri pedimos hamburguesas a las 9pm y en 28 minutos ya estábamos cenando. Muy recomendados.', author: 'Mateo Caraveo' }
  ];

  const poolReviews = [...shortReviews, ...mediumReviews, ...extraMedium, ...longReviews];
  const all: NaturalReview[] = [];
  let age = 3;

  for (let i = 0; i < poolReviews.length && all.length < 128; i++) {
    const r = poolReviews[i];
    all.push({
      rating: r.rating,
      title: r.title,
      body: r.body,
      author_name: r.author,
      author_masked_contact: `${r.author.slice(0, 1).toLowerCase()}***${r.author.length > 5 ? r.author.slice(-1).toLowerCase() : 'x'}@gmail.com`,
      verification_level: r.rating === 5 ? (all.length % 3 === 0 ? 'confirmed_payment' : 'confirmed_store_order') : 'reviewed_proof',
      ageDays: Math.min(310, Math.round(age)),
      product_name: 'Envío Gastronómico Barri'
    });
    age += (all.length % 4 === 0 ? 1 : (all.length % 7 === 0 ? 5 : 2.4));
  }

  return all;
}

// -----------------------------------------------------------------------------
// 2. GOGYM.MX (64 REVIEWS, TARGET ~4.7★)
// -----------------------------------------------------------------------------
function getGoGymReviews(): NaturalReview[] {
  const reviewsData: Array<{ rating: number; title: string; body: string; author: string; age: number }> = [
    { rating: 5, title: 'Super práctico el QR', body: 'El acceso por código QR en el celular es una chulada, llego y entro sin tener que esperar en recepción.', author: 'Memo R.', age: 6 },
    { rating: 5, title: 'Excelente app para el gym', body: 'La aplicación está muy intuitiva, puedo checar mis rutinas y las marcas de peso sin andar cargando libretas.', author: 'Carlos G.', age: 10 },
    { rating: 4, title: 'Muy buena pero le falta algo', body: 'Muy buen sistema para entrar al gym, solo me gustaría que se pudieran agendar clases de spinning con más días de anticipación.', author: 'Sofi Cantú', age: 14 },
    { rating: 5, title: 'Facturación automática sin broncas', body: 'Me encanta que mi factura del SAT llega en automático a mi correo cada inicio de mes sin tener que pedirla en mostrador.', author: 'C.P. Daniel Garza', age: 18 },
    { rating: 5, title: 'Pude congelar mensualidad', body: 'Tuve viaje de trabajo dos semanas y pude congelar mi mensualidad directo desde el celular sin trámites pesados.', author: 'Mariana Rdz', age: 24 },
    { rating: 5, title: 'Torniquetes seguros', body: 'Desde que pusieron los torniquetes con GoGym el gimnasio se siente mucho más seguro y ordenado.', author: 'Coach Roberto', age: 29 },
    { rating: 4, title: 'Buen sistema', body: 'Buen sistema en general, a veces se tarda un segundo en leer el QR con poca luz pero funciona bien.', author: 'Paco Hdez', age: 34 },
    { rating: 5, title: 'Nos quitó un dolor de cabeza', body: 'Como dueño de gimnasio en Chihuahua el control de cobros y accesos con GoGym nos ahorró fugas de dinero y discusiones en recepción.', author: 'Iron Fitness Cuauhtémoc', age: 39 },
    { rating: 5, title: 'Todo en orden con los pagos', body: 'El cobro a mi tarjeta pasa puntual y te avisan un día antes por WhatsApp, cero cargos sorpresa.', author: 'Vale Mtz', age: 45 },
    { rating: 4, title: 'Cómodo para entrenar', body: 'Muy cómodo checar el aforo antes de ir para no toparme el gym hasta el tope.', author: 'Alex Terrazas', age: 51 },
    { rating: 5, title: '10/10 la app', body: '10/10 la app, rápida y no consume batería.', author: 'Dani M.', age: 57 },
    { rating: 5, title: 'Muy buen soporte', body: 'Cambié de teléfono y no podía abrir mi sesión, en soporte me resolvieron por whats en menos de 5 minutos.', author: 'Claudia B.', age: 63 },
    { rating: 4, title: 'Buena opción', body: 'Buena app para socios, me gusta llevar el registro de mis entrenamientos diarios.', author: 'Fer Morales', age: 69 },
    { rating: 5, title: 'Acceso de volada', body: 'Abres la app, sale el QR y entras en un segundo, muy moderno.', author: 'Lupita V.', age: 74 },
    { rating: 5, title: 'Recomendado para dueños de gym', body: 'Manejamos Arrebatados Gym y migrar a GoGym fue la mejor decisión comercial del año, los reportes financieros salen al tiro.', author: 'Arrebatados Gym', age: 80 },
    { rating: 4, title: 'Práctico', body: 'Muy práctico para pagar la mensualidad sin hacer fila en caja.', author: 'Jorge L.', age: 86 },
    { rating: 5, title: 'Sin fallas', body: 'Llevo 6 meses entrenando con este sistema y nunca se ha caído el acceso.', author: 'Beto C.', age: 92 },
    { rating: 5, title: 'Excelente administración', body: 'Nos simplificó la vida en la recepción de Bellu Studio, las socias entran directo y pagan en línea.', author: 'Bellu Studio', age: 98 },
    { rating: 4, title: 'Buena plataforma', body: 'Fácil de usar, me ayuda a ver mis pagos pasados y comprobantes.', author: 'Ana Karen', age: 104 },
    { rating: 5, title: 'Genial el seguimiento de coach', body: 'Mi entrenador me sube los ejercicios directo a la app con videos de técnica, súper útil.', author: 'Chema Ortiz', age: 110 },
    { rating: 5, title: 'De diez', body: 'De diez la experiencia, todo automatizado y sin papeles.', author: 'Héctor Ch.', age: 116 },
    { rating: 4, title: 'Todo bien', body: 'Todo bien, la app corre fluido en iPhone.', author: 'Paola S.', age: 122 },
    { rating: 5, title: 'Muy profesional', body: 'Le da un toque muy profesional y de primer nivel al gimnasio.', author: 'Ricardo D.', age: 128 },
    { rating: 5, title: 'Cobros claros', body: 'Cero cobros indebidos, si quieres cancelar lo haces desde tu cuenta sin letras chiquitas.', author: 'Eduardo P.', age: 135 },
    { rating: 4, title: 'Útil', body: 'Me gusta que me avisa cuándo se me vence la mensualidad para no quedarme fuera.', author: 'Miriam T.', age: 141 },
    { rating: 5, title: 'Excelente para boxeo y crossfit', body: 'En Spartan Training nos ayudó a organizar los cupos de las clases de las 7pm que siempre se saturaban.', author: 'Spartan Training', age: 147 },
    { rating: 5, title: 'Súper rápido', body: 'Entras sin detenerte ni traer credencial de plástico estorbosa.', author: 'Javier B.', age: 153 },
    { rating: 4, title: 'Bien hecho', body: 'Plataforma mexicana bien hecha y estable.', author: 'Andrea L.', age: 159 },
    { rating: 5, title: 'Gran herramienta para entrenadores', body: 'Como entrenador personal puedo ver la asistencia de mis alumnos y si han cumplido sus rutinas.', author: 'Coach David', age: 165 },
    { rating: 5, title: 'Recomendadísimo', body: 'Recomendadísimo, el mejor software de gimnasio que he visto en México.', author: 'Luis Carlos', age: 171 },
    { rating: 4, title: 'Buen servicio', body: 'Todo en orden con mis cobros mensuales.', author: 'Karla N.', age: 177 },
    { rating: 5, title: 'Cero filas para entrar', body: 'Llegas a las 6 de la tarde que está lleno y pasas sin fila por el torniquete QR.', author: 'Rubén C.', age: 183 },
    { rating: 5, title: 'Control total del aforo', body: 'En Ultra Gym nos permitió mantener el orden en vestidores y áreas de peso libre.', author: 'Ultra Gym', age: 189 },
    { rating: 4, title: 'Práctico y seguro', body: 'Ya no tengo que preocuparme por olvidar la tarjetita en el carro.', author: 'Silvia S.', age: 195 },
    { rating: 5, title: 'Al cien', body: 'Al cien la interfaz, muy fácil de entender hasta para los que no somos de tecnología.', author: 'Óscar T.', age: 201 },
    { rating: 5, title: 'Soporte rápido en WhatsApp', body: 'Cambié de tarjeta y me asesoraron de volada por el chat.', author: 'Diana Q.', age: 207 },
    { rating: 4, title: 'Buena app para socios', body: 'Cumple con lo que promete, checas tus días y tu acceso sin problemas.', author: 'Arturo H.', age: 213 },
    { rating: 5, title: 'Súper recomendado', body: 'Nuestros socios en Bita Fitness están felices con la app móvil.', author: 'Bita Fitness', age: 219 },
    { rating: 5, title: 'Moderno y limpio', body: 'Todo digital, se acabaron las carpetas con hojas arrugadas en el mostrador.', author: 'Manuel M.', age: 225 },
    { rating: 4, title: 'Buen control', body: 'Buen control de pagos y membresías familiares.', author: 'Tania N.', age: 231 },
    { rating: 5, title: 'Facilidad de uso', body: 'Mis hijos y yo usamos la misma cuenta familiar y cada quien tiene su pase en el cel.', author: 'Jorge O.', age: 237 },
    { rating: 5, title: 'Excelente plataforma', body: 'El torniquete responde rápido y la app nunca me ha dejado colgado.', author: 'Verónica R.', age: 243 },
    { rating: 4, title: 'Cumple bien', body: 'Sencilla de usar y confiable.', author: 'Armando Q.', age: 249 },
    { rating: 5, title: 'Me ahorra tiempo', body: 'Pago en línea y ya no tengo que esperar a que me cobren en recepción.', author: 'Leticia T.', age: 255 },
    { rating: 5, title: 'De primera', body: 'Software de primer nivel hecho para gimnasios en México.', author: 'Emilio B.', age: 261 },
    { rating: 4, title: 'Buena herramienta', body: 'Me avisa de eventos y promociones especiales del gimnasio.', author: 'Norma C.', age: 267 },
    { rating: 5, title: 'Súper fluido', body: 'Rápido acceso y las gráficas de peso te motivan.', author: 'Hugo D.', age: 273 },
    { rating: 5, title: 'Totalmente recomendado', body: 'La mejor opción para modernizar un gimnasio sin gastar una millonada.', author: 'Natalia E.', age: 279 },
    { rating: 4, title: 'Todo en orden', body: 'Todo correcto con las reservaciones de clases.', author: 'César F.', age: 285 },
    { rating: 5, title: 'Genial el acceso', body: 'Con reloj o celular pasas de volada.', author: 'Gloria G.', age: 291 },
    { rating: 5, title: 'Gran servicio', body: 'Soporte siempre dispuesto a ayudar.', author: 'Arturo H.', age: 297 },
    { rating: 4, title: 'Buena app', body: 'Fácil de navegar y ver rutinas.', author: 'Marisol I.', age: 303 },
    { rating: 5, title: 'Excelente inversión', body: 'Instalamos el sistema en Zona Fit 24 y el control nocturno es impecable.', author: 'Zona Fit 24', age: 309 },
    { rating: 5, title: '10 de 10', body: '10 de 10, muy práctico para los que entrenamos temprano antes de la chamba.', author: 'David J.', age: 315 },
    { rating: 4, title: 'Sin quejas', body: 'Cumple perfecto para entrar y checar pagos.', author: 'Raquel L.', age: 321 },
    { rating: 5, title: 'Rápido y eficiente', body: 'El lector QR no falla, excelente servicio.', author: 'Manuel M.', age: 326 },
    { rating: 5, title: 'Muy satisfecho', body: 'Muy satisfecho con el servicio y la app.', author: 'Tania N.', age: 331 },
    { rating: 4, title: 'Recomendable', body: 'Buena app para gimnasios locales.', author: 'Jorge O.', age: 335 },
    { rating: 5, title: 'Gran tecnología', body: 'Le dio un giro moderno a nuestro gym.', author: 'Carmen P.', age: 339 },
    { rating: 5, title: 'Súper bien', body: 'Todo al cien, sin problemas.', author: 'Armando Q.', age: 342 },
    { rating: 4, title: 'Bien', body: 'Buen sistema de acceso.', author: 'Verónica R.', age: 345 },
    { rating: 5, title: 'Excelente', body: 'Excelente servicio en todos los sentidos.', author: 'Ignacio S.', age: 348 },
    { rating: 5, title: 'De diez', body: 'Muy cómodo y seguro para entrenar.', author: 'Leticia T.', age: 350 },
    { rating: 5, title: 'Al tiro', body: 'Quedó al tiro en nuestro gimnasio, recomendado.', author: 'Power Gym', age: 352 }
  ];

  return reviewsData.map(r => ({
    rating: r.rating,
    title: r.title,
    body: r.body,
    author_name: r.author,
    author_masked_contact: `${r.author.slice(0, 1).toLowerCase()}***${r.author.length > 5 ? r.author.slice(-1).toLowerCase() : 'g'}@gmail.com`,
    verification_level: r.rating === 5 ? 'confirmed_payment' : 'confirmed_store_order',
    ageDays: r.age,
    product_name: 'Suscripción GoGym'
  }));
}

// -----------------------------------------------------------------------------
// 3. DOCTOR.MX (48 REVIEWS, TARGET ~4.7★)
// -----------------------------------------------------------------------------
function getDoctorReviews(): NaturalReview[] {
  const reviewsData: Array<{ rating: number; title: string; body: string; author: string; age: number }> = [
    { rating: 5, title: 'Excelente consulta por videollamada', body: 'Tenía a mi niña con fiebre en la noche y la pediatra nos atendió en 10 minutos por video. Muy atenta y clara con las dosis.', author: 'Mariana Rdz', age: 7 },
    { rating: 5, title: 'Receta digital aceptada en la farmacia', body: 'Me mandaron la receta en PDF con código QR y en Farmacias del Ahorro me la surtieron sin ponerme ninguna traba.', author: 'Memo R.', age: 13 },
    { rating: 4, title: 'Buena atención médica', body: 'El doctor me escuchó con mucha paciencia, solo se tardó unos 5 min en conectar por detalles de señal pero la consulta fue muy buena.', author: 'Carlos Garza', age: 19 },
    { rating: 5, title: 'Me ahorró horas de sala de espera', body: 'Estaba en el trabajo con dolor de espalda fuerte, consulté en mi hora de comida y me mandaron desinflamatorio sin tener que pedir permiso para salir.', author: 'Sofi Cantú', age: 26 },
    { rating: 5, title: 'Muy profesional la doctora', body: 'Consulta dermatológica de primera. La doctora me revisó una alergia por fotos y cámara y el tratamiento me quitó la comezón al segundo día.', author: 'Paco Hdez', age: 33 },
    { rating: 4, title: 'Práctico y seguro', body: 'Buena opción para no ir al consultorio cuando traes gripe y no quieres contagiar a nadie.', author: 'Lupita V.', age: 40 },
    { rating: 5, title: '10/10 el servicio', body: '10/10 la atención, los doctores tienen cédula verificada en el portal y te da mucha tranquilidad.', author: 'Beto C.', age: 47 },
    { rating: 5, title: 'Orientación médica de volada', body: 'Me resolvieron dudas de unos estudios de laboratorio en caliente sin tener que esperar cita de semanas con el especialista.', author: 'Dani M.', age: 54 },
    { rating: 4, title: 'Buen trato', body: 'El médico general muy respetuoso, me explicó con peras y manzanas qué me pasaba.', author: 'Fer Morales', age: 61 },
    { rating: 5, title: 'Excelente seguimiento', body: 'A los 3 días me mandaron mensaje por whats para ver cómo seguía de los síntomas, ese detalle se agradece un buen.', author: 'Claudia B.', age: 68 },
    { rating: 5, title: 'Súper recomendado', body: 'Para los que tenemos niños chiquitos tener pediatras en línea 24/7 hace un parote enorme.', author: 'Vale Mtz', age: 75 },
    { rating: 4, title: 'Buena consulta', body: 'Rápido, económico y profesional. Buena alternativa.', author: 'Jorge L.', age: 82 },
    { rating: 5, title: 'Trato cálido y humano', body: 'Consulta de psicología muy ética y con mucha empatía. Me sentí en confianza desde el primer minuto.', author: 'Ana Karen G.', age: 89 },
    { rating: 5, title: 'Sin hacer filas en clínica', body: 'Pude consultar desde casa un domingo temprano sin andar batallando con el tráfico ni estacionamiento.', author: 'Alex Terrazas', age: 96 },
    { rating: 4, title: 'Todo en orden', body: 'Consulta rápida para una infección de garganta, el antibiótico me funcionó bien.', author: 'Chema Ortiz', age: 103 },
    { rating: 5, title: 'Doctores de verdad', body: 'Se nota que son médicos con experiencia clínica real, te preguntan antecedentes y alergias antes de recetar cualquier cosa.', author: 'Dr. Héctor Mtz', age: 110 },
    { rating: 5, title: 'Muy práctico', body: 'Pagué con tarjeta de débito y entré directo a la sala virtual.', author: 'Héctor Ch.', age: 118 },
    { rating: 4, title: 'Buena plataforma', body: 'La videollamada se ve nítida y el sonido no se corta.', author: 'Paola S.', age: 125 },
    { rating: 5, title: 'Nutrióloga excelente', body: 'Mi plan de nutrición me lo adaptaron a lo que me gusta comer y ya bajé 3 kilos en el primer mes.', author: 'Ricardo D.', age: 132 },
    { rating: 5, title: 'De diez', body: 'De diez la rapidez con la que te contactan con un médico disponible.', author: 'Eduardo P.', age: 140 },
    { rating: 4, title: 'Recomendable', body: 'Buena atención para cuando no es una emergencia de hospital.', author: 'Miriam T.', age: 148 },
    { rating: 5, title: 'Fácil para adultos mayores', body: 'Ayudé a mi abuela a tomar su consulta de control de presión y la doctora fue un amor con ella.', author: 'Javier B.', age: 156 },
    { rating: 5, title: 'Confiable y seguro', body: 'Tus datos médicos se quedan privados y la receta viene con todos los sellos oficiales.', author: 'Andrea L.', age: 164 },
    { rating: 4, title: 'Buen servicio médico', body: 'Todo bien, resolvieron mis dudas y el tratamiento fue adecuado.', author: 'Luis Carlos', age: 172 },
    { rating: 5, title: 'Súper accesible', body: 'Mucho más accesible en costo que una consulta privada tradicional y la misma calidad.', author: 'Karla N.', age: 180 },
    { rating: 5, title: 'Atención de madrugada', body: 'A las 2am mi hijo empezó con dolor de estómago y el médico de guardia nos orientó de volada.', author: 'Rubén C.', age: 188 },
    { rating: 4, title: 'Práctico', body: 'Buen servicio para no perder el día de chamba.', author: 'Silvia S.', age: 196 },
    { rating: 5, title: 'Diagnóstico certero', body: 'El doctor me mandó los estudios exactos que necesitaba y dio en el clavo con el problema.', author: 'Óscar T.', age: 204 },
    { rating: 5, title: 'Excelente plataforma', body: 'Plataforma mexicana bien pensada, fácil de usar en el celular.', author: 'Diana Q.', age: 212 },
    { rating: 4, title: 'Buena opción', body: 'Rápido y sin complicaciones.', author: 'Arturo H.', age: 220 },
    { rating: 5, title: 'Muy satisfecho', body: 'Me mandaron incapacidad con folio oficial y en recursos humanos me la aceptaron sin problema.', author: 'Manuel M.', age: 228 },
    { rating: 5, title: 'Gran trato profesional', body: 'Médicos certificados con excelente calidez humana.', author: 'Tania N.', age: 236 },
    { rating: 4, title: 'Todo bien', body: 'Buena consulta de seguimiento.', author: 'Jorge O.', age: 244 },
    { rating: 5, title: 'Al cien', body: 'Al cien el servicio, me sirvió bastante.', author: 'Verónica R.', age: 252 },
    { rating: 5, title: 'Sin contratiempos', body: 'Conexión rápida y receta en PDF al instante.', author: 'Armando Q.', age: 260 },
    { rating: 4, title: 'Correcto', body: 'El doctor atendió puntual a la hora agendada.', author: 'Leticia T.', age: 268 },
    { rating: 5, title: 'Recomendadísimo', body: 'Recomendadísimo para consultas familiares y chequeos rápidos.', author: 'Emilio B.', age: 276 },
    { rating: 5, title: 'Excelente ética', body: 'No te recetan medicamentos caros a lo tonto, te mandan lo que realmente necesitas.', author: 'Norma C.', age: 284 },
    { rating: 4, title: 'Buen trato', body: 'El doctor fue muy claro en sus explicaciones.', author: 'Hugo D.', age: 292 },
    { rating: 5, title: 'Súper rápido', body: 'En 15 minutos ya tenía mi receta en el cel.', author: 'Natalia E.', age: 300 },
    { rating: 5, title: 'Gran alternativa', body: 'Gran alternativa para gente con horarios complicados de oficina.', author: 'César F.', age: 308 },
    { rating: 4, title: 'Bien', body: 'Buena atención médica por videollamada.', author: 'Gloria G.', age: 316 },
    { rating: 5, title: 'De primera calidad', body: 'Atención de primer nivel, muy agradecido con la doctora.', author: 'Arturo H.', age: 324 },
    { rating: 5, title: '10 de 10', body: '10 de 10, no vuelvo a pararme en una sala de espera si no es urgencia.', author: 'Marisol I.', age: 331 },
    { rating: 4, title: 'Buena experiencia', body: 'Todo en orden con la consulta.', author: 'David J.', age: 336 },
    { rating: 5, title: 'Súper amables', body: 'Desde soporte hasta el médico todos súper atentos.', author: 'Raquel L.', age: 340 },
    { rating: 5, title: 'Excelente', body: 'Excelente servicio, muy recomendado.', author: 'Manuel M.', age: 344 },
    { rating: 5, title: 'Confiable', body: 'Plataforma muy seria y doctores preparados.', author: 'Tania N.', age: 348 }
  ];

  return reviewsData.map(r => ({
    rating: r.rating,
    title: r.title,
    body: r.body,
    author_name: r.author,
    author_masked_contact: `${r.author.slice(0, 1).toLowerCase()}***${r.author.length > 5 ? r.author.slice(-1).toLowerCase() : 'd'}@gmail.com`,
    verification_level: r.rating === 5 ? 'confirmed_payment' : 'confirmed_store_order',
    ageDays: r.age,
    product_name: 'Consulta Médica Doctor.mx'
  }));
}

// -----------------------------------------------------------------------------
// 4. BIEN.MX (38 REVIEWS, TARGET 5.0★ - 100% 5-STARS AS REQUESTED)
// -----------------------------------------------------------------------------
function getBienReviews(): NaturalReview[] {
  const reviewsData: Array<{ title: string; body: string; author: string; age: number }> = [
    { title: 'La neta nos quitó un dolor de cabeza', body: 'Manejamos taller mecánico y los clientes mandaban whats a todas horas preguntando por sus carros. Con el agente de Bien les contesta al segundo con el estatus y nos ahorra horas al día.', author: 'Taller El Inge - Don Pepe', age: 5 },
    { title: 'Cotizaciones al segundo en WhatsApp', body: 'Vendemos perfiles tubulares y acero en Chihuahua. Los clientes mandan sus listas y el agente les cotiza con precios actualizados de volada sin que tengamos que estar pegados a la compu.', author: 'Ing. H. Villarreal', age: 9 },
    { title: 'Facturación CFDI 4.0 sin fallas', body: 'Nuestros clientes piden factura directo por whats al hacer su compra, ponen su RFC y en dos minutos les llega el PDF y XML timbrado. Una maravilla.', author: 'C.P. Daniela Vega', age: 14 },
    { title: 'Filtra prospectos de volada', body: 'Desarrollamos departamentos en Querétaro. Corríamos pauta en Meta y nos llegaban cientos de curiosos; el agente califica presupuestos y nos pasa solo los que de verdad van a comprar.', author: 'Arq. Esteban Morales', age: 20 },
    { title: 'El tono suena bien natural', body: 'Teníamos miedo de que pareciera bot gringo acartonado, pero entiende modismos mexicanos como "ándale", "qué onda", "órale" y la gente piensa que habla con una recepcionista real.', author: 'Lorena Hinojosa', age: 25 },
    { title: 'Cobros con SPEI validados al momento', body: 'Vendemos pastelería y mesas de postres para eventos. El cliente transfiere, manda foto del comprobante y el agente lo valida en el acto y agenda la entrega.', author: 'Chef Adrián Elizondo', age: 31 },
    { title: 'Setup llave en mano en menos de una hora', body: 'Nosotros somos dentistas, cero de programación. El equipo de Bien nos conectó el WhatsApp oficial de la clínica en caliente y quedó al tiro el mismo día.', author: 'Dr. Alex Mtz', age: 37 },
    { title: 'Atención 24/7 para clínica veterinaria', body: 'Atendemos urgencias de perritos en la noche. El agente detecta palabras de gravedad, da indicaciones preliminares y le timbra al veterinario de guardia sin perder un segundo.', author: 'Dra. Sofi Cantú', age: 43 },
    { title: 'Triplicamos cierres en la promotoría', body: 'En venta de seguros el que cotiza primero gana la póliza. Antes tardábamos medio día en responder y con Bien cotizamos seguros de auto en 3 minutos.', author: 'Guillermo B.', age: 49 },
    { title: 'Inscripciones de la escuela automatizadas', body: 'En temporada de inscripciones nos entraban 300 whats diarios para informes de primaria y secundaria. El agente dio costos, horarios y mandó ligas de pago sin saturarnos.', author: 'Prof. Javier Domínguez', age: 56 },
    { title: 'Validación de RFCs en automático', body: 'En la refaccionaria hacemos cientos de facturas. El bot valida la constancia fiscal del cliente contra el SAT antes de timbrar para que no haya rechazos.', author: 'Refaccionaria del Norte', age: 62 },
    { title: 'El mejor software mexicano que hemos probado', body: 'Probamos herramientas gringas carísimas que no entendían el IVA ni cómo compran los clientes aquí. Bien está hecho justo para las costumbres de venta de México.', author: 'Memo Rdz', age: 69 },
    { title: 'Despacho contable al día', body: 'Nuestros clientes nos piden constancias de situación fiscal y estados de cuenta por whats a cualquier hora y el bot se los genera al instante.', author: 'Lic. Treviño Contadores', age: 75 },
    { title: 'Agendamiento de pruebas de manejo', body: 'Vendemos seminuevos garantizados en Michoacán. La gente ve los autos en TikTok, manda whats y el agente les agenda la cita en la sucursal de una.', author: 'Héctor Carranza', age: 82 },
    { title: 'Aguantó el Hot Sale sin pestañear', body: 'Tuvimos picos de 80 mensajes por minuto en la tienda en línea durante el Hot Sale y ni una sola conversación se quedó en visto.', author: 'Mónica Estrada', age: 89 },
    { title: 'Nos ayudaron con la palomita verde de Meta', body: 'Llevábamos semanas batallando con el Business Manager de Meta para verificar la empresa y la gente de soporte de Bien nos guió paso a paso hasta que quedó.', author: 'Lic. Tomás A.', age: 96 },
    { title: 'Reservaciones en restaurante de lujo', body: 'En nuestro restaurante en Oaxaca las mesas se llenan rápido. El agente toma reservaciones, confirma anticipos y manda el recordatorio un día antes.', author: 'Valentina Solís', age: 104 },
    { title: 'Auditoría que nos ahorró lana', body: 'Antes de vendernos nos revisaron cómo atendíamos los mensajes y nos señalaron fugas de clientes por tardar en contestar. Muy honestos.', author: 'Ing. Bernardo Trejo', age: 111 },
    { title: 'Mis mecánicos ya no pierden tiempo al cel', body: 'Tener al maestro mecánico contestando dudas por teléfono es dinero tirado. Bien contesta dudas frecuentes y precios y el equipo se enfoca en reparar.', author: 'Don Mario Benítez', age: 118 },
    { title: 'La voz de Hablo suena como persona real', body: 'Hicimos pruebas con clientes regulares llamando a la línea fija y ninguno se dio cuenta que era voz con IA, responde fluido y con tono amable.', author: 'Mariana Leal', age: 125 },
    { title: 'Cumplimiento y seriedad total', body: 'Para nuestro despacho jurídico la confidencialidad es sagrada. Los servidores y la protección de datos que manejan nos dieron total tranquilidad.', author: 'Lic. Sergio Villarreal', age: 132 },
    { title: 'Venta cruzada en estética canina', body: 'Cuando el cliente agenda baño para su mascota el agente le sugiere vacunas o desparasitación y las ventas subieron un buen.', author: 'Dra. Andrea M.', age: 139 },
    { title: 'Sin contratos forzosos ni letras chiquitas', body: 'Empezamos con el plan chico para probar y al ver el resultado subimos de plan. No te amarran con contratos anuales forzosos.', author: 'Ing. Gabriel Ponce', age: 146 },
    { title: 'Cotizaciones de fletes en segundos', body: 'Operamos fletes en el Bajío. El agente pide origen, destino, peso y dimensiones y saca el estimado en caliente.', author: 'Transportes Zúñiga', age: 152 },
    { title: 'Membresías de gimnasio sin filas', body: 'El agente manda fotos del gym, los paquetes de crossfit y la liga de pago por WhatsApp, súper práctico.', author: 'Coach Báez', age: 158 },
    { title: 'Sincronización de inventario en tiempo real', body: 'Si se agota una talla de zapato en la bodega el agente lo sabe y ya no la ofrece a los clientes. Cero quejas de pedidos cancelados.', author: 'Elena Santillán', age: 163 },
    { title: 'El mejor aliado para la constructora', body: 'Atendemos clientes interesados en terrenos en Mérida desde cualquier parte del país a cualquier hora.', author: 'Arq. Manuel Pech', age: 167 },
    { title: 'Súper recomendado para ferreterías', body: 'Tenemos miles de tornillos y números de parte. El catálogo automatizado encuentra exactamente la pieza que busca el herrero.', author: 'Ferretería La Central', age: 169 },
    { title: 'Agendamiento médico sin fallas', body: 'El bot coordina la agenda de 4 doctores en la clínica y sincroniza con Google Calendar sin empalmar citas.', author: 'Clínica Ginecológica CDMX', age: 171 },
    { title: 'Respuestas de volada', body: 'Nuestros clientes siempre nos felicitan por lo rápido que les contestamos las dudas en Facebook y WhatsApp.', author: 'Paco Valenzuela', age: 172 },
    { title: '10/10 la atención de soporte', body: 'Cualquier ajuste de texto o menú te lo hacen en caliente, gente muy chambeadora y atenta.', author: 'Gaby Rdz', age: 173 },
    { title: 'Puntualidad y formalidad', body: 'Desde la primera junta nos hablaron con la verdad de lo que sí y no podía hacer el bot. Esa transparencia vale oro.', author: 'Lic. Fernando C.', age: 174 },
    { title: 'Nos facilitó las ventas de noche', body: 'Casi el 40% de nuestras ventas se cierran entre 8pm y medianoche cuando la gente ya salió de trabajar. El agente nunca duerme.', author: 'Boutique San Pedro', age: 175 },
    { title: 'Excelente para cotizar eventos', body: 'Renta de mobiliario y carpas en Guadalajara. Pide fecha y número de invitados y entrega la cotización en PDF.', author: 'Eventos Alvídrez', age: 175 },
    { title: 'Muy buena herramienta', body: 'Fácil de operar y el panel de control te deja ver todas las conversaciones si quieres entrar a contestar en persona.', author: 'Carlos Domínguez', age: 176 },
    { title: 'Totalmente satisfecho', body: 'La inversión se pagó sola en el primer mes con los clientes que antes se iban con la competencia por no contestarles rápido.', author: 'Hugo Duarte', age: 176 },
    { title: 'Solución mexicana de calidad', body: 'Orgullo que en México se desarrolle software de inteligencia artificial con este nivel de pulido.', author: 'Ing. Rodrigo Mendoza', age: 177 },
    { title: 'Una chulada de servicio', body: 'Una chulada la verdad, mis respetos para todo el equipo de Bien.mx 👍', author: 'Don Charly', age: 178 }
  ];

  return reviewsData.map(r => ({
    rating: 5,
    title: r.title,
    body: r.body,
    author_name: r.author,
    author_masked_contact: `${r.author.slice(0, 1).toLowerCase()}***${r.author.length > 5 ? r.author.slice(-1).toLowerCase() : 'b'}@gmail.com`,
    verification_level: 'confirmed_payment',
    ageDays: r.age,
    product_name: 'Módulo Conversa & Soluciones IA Bien.mx'
  }));
}

// -----------------------------------------------------------------------------
// 5. HABLO.COM.MX (32 REVIEWS, TARGET ~4.8★)
// -----------------------------------------------------------------------------
function getHabloReviews(): NaturalReview[] {
  const reviewsData: Array<{ rating: number; title: string; body: string; author: string; age: number }> = [
    { rating: 5, title: 'Ya no perdemos llamadas en viernes', body: 'Los viernes en la noche la línea de la pizzería siempre daba ocupado y los clientes se iban con otros. Con Sofía contesta todas las llamadas a la vez y toma los pedidos.', author: 'Pizzería Roma', age: 6 },
    { rating: 5, title: 'Entiende las notas de cocina al tiro', body: 'La gente pide que "sin cebolla", "con salsa aparte" o "bien doradita la carne". Sofía lo transcribe exacto y el ticket sale perfecto en cocina.', author: 'Tacos El Gavilán', age: 12 },
    { rating: 4, title: 'Muy buena voz', body: 'La voz suena muy natural, nada de robot trabado. Lo único es que con mucho ruido de fondo en la llamada a veces pide repetir la dirección.', author: 'Hamburguesas Rocker', age: 19 },
    { rating: 5, title: 'Confirmación al WhatsApp del cliente', body: 'En cuanto cuelgan la llamada telefónica les llega el resumen de su comanda y el monto exacto por WhatsApp, eso le da muchísima confianza a la gente.', author: 'Sushi Master', age: 26 },
    { rating: 5, title: 'Subió el ticket promedio', body: 'Sofía sugiere el postre o la bebida de manera muy amable y el 30% de los comensales aceptan el complemento. El ticket subió solo.', author: 'Alitas & Ribs Norte', age: 34 },
    { rating: 4, title: 'Buen sistema telefónico', body: 'Nos sirvió mucho para la rosticería los domingos al mediodía cuando las filas están hasta la banqueta.', author: 'Rosticería San Juan', age: 42 },
    { rating: 5, title: 'Cero llamadas perdidas', body: 'Llevamos dos meses y el reporte de llamadas perdidas bajó a cero absoluto. Muy contentos con el servicio.', author: 'Café Bistro 14', age: 50 },
    { rating: 5, title: 'Soporte atento y en corto', body: 'Cambiamos precios de temporada y en soporte nos actualizaron el menú de voz en menos de media hora.', author: 'Mariscos Mazatlán', age: 58 },
    { rating: 4, title: 'Buena recepcionista con IA', body: 'Funciona muy bien para tomar órdenes de comida para llevar y canalizar dudas generales.', author: 'Don Polo Tortas', age: 66 },
    { rating: 5, title: '10/10 la atención de Sofía', body: 'Varios clientes me han dicho en mostrador: "qué amable la señorita que me tomó la orden por teléfono", ni cuenta se dieron de que era IA.', author: 'La Casa del Pastor', age: 74 },
    { rating: 5, title: 'Comandas directas a impresora térmica', body: 'La llamada termina y la comanda sale impresa en cocina al instante. El personal trabaja mucho más relajado.', author: 'Chef Marco S.', age: 82 },
    { rating: 4, title: 'Práctico para delivery', body: 'Muy práctico para horas pico donde nadie tiene tiempo de contestar el teléfono.', author: 'Paco Hdez', age: 90 },
    { rating: 5, title: 'Excelente inversión', body: 'Se pagó sola evitando las ventas que perdíamos por no tener suficientes manos para atender las dos líneas.', author: 'Memo Rdz', age: 98 },
    { rating: 5, title: 'Súper fluido', body: 'La llamada no tiene pausas incómodas, contesta de inmediato y con modulación educada.', author: 'Mariana Treviño', age: 106 },
    { rating: 4, title: 'Buen servicio', body: 'Todo en orden, buena herramienta para restaurantes.', author: 'Carlos Garza', age: 114 },
    { rating: 5, title: 'Recomendadísimo', body: 'Para cualquier negocio gastronómico con servicio a domicilio esto es una maravilla.', author: 'Don Charly', age: 122 },
    { rating: 5, title: 'Atención impecable', body: 'Toma nombre, teléfono y dirección sin equivocarse en los números.', author: 'Sofi Cantú', age: 130 },
    { rating: 5, title: 'Sin quejas', body: 'El sistema es muy estable y nunca se nos ha caído en fin de semana.', author: 'Beto C.', age: 138 },
    { rating: 4, title: 'Buena herramienta', body: 'Nos ayudó a recortar tiempos de espera en el conmutador.', author: 'Dani M.', age: 146 },
    { rating: 5, title: 'Al cien', body: 'Al cien la calidad del audio y la comprensión de acentos norteños.', author: 'Chema Ortiz', age: 154 },
    { rating: 5, title: 'De diez', body: 'De diez la tecnología, mis respetos para los programadores de Hablo.', author: 'Lupita V.', age: 162 },
    { rating: 5, title: 'Gran recepcionista virtual', body: 'Responde con el saludo oficial del restaurante y da los horarios de memoria.', author: 'Fer Morales', age: 170 },
    { rating: 5, title: 'Muy amables en soporte', body: 'Nos ayudaron con la configuración de la troncal telefónica sin costo extra.', author: 'Claudia B.', age: 178 },
    { rating: 4, title: 'Cumple bien', body: 'Buena opción para no contratar personal extra solo para el teléfono.', author: 'Jorge L.', age: 186 },
    { rating: 5, title: 'Excelente experiencia', body: 'Nuestros clientes habituales se acostumbraron de volada a pedir con Sofía.', author: 'Alex Terrazas', age: 194 },
    { rating: 5, title: 'Rápido y eficiente', body: 'Una llamada promedio para pedir comida toma menos de un minuto.', author: 'Vale Mtz', age: 202 },
    { rating: 5, title: 'Gran solución', body: 'Se acabaron las quejas de comensales que no lograban comunicarse.', author: 'Ana Karen', age: 210 },
    { rating: 5, title: 'Súper recomendado', body: 'La mejor herramienta de telefonía con IA que hemos probado en México.', author: 'Ricardo D.', age: 218 },
    { rating: 4, title: 'Bien', body: 'Todo en orden con la toma de pedidos telefónicos.', author: 'Eduardo P.', age: 226 },
    { rating: 5, title: 'De primera', body: 'Servicio de primer nivel y costo muy accesible.', author: 'Paola S.', age: 234 },
    { rating: 5, title: 'Puntualidad y orden', body: 'Las comandas salen numeradas y sin confusiones con cocina.', author: 'Héctor Ch.', age: 242 },
    { rating: 5, title: 'Totalmente satisfecho', body: 'Una solución de diez para cualquier negocio de comida.', author: 'Miriam T.', age: 250 }
  ];

  return reviewsData.map(r => ({
    rating: r.rating,
    title: r.title,
    body: r.body,
    author_name: r.author,
    author_masked_contact: `${r.author.slice(0, 1).toLowerCase()}***${r.author.length > 5 ? r.author.slice(-1).toLowerCase() : 'h'}@gmail.com`,
    verification_level: r.rating === 5 ? 'confirmed_payment' : 'confirmed_store_order',
    ageDays: r.age,
    product_name: 'Agente Telefónico Sofia'
  }));
}

// -----------------------------------------------------------------------------
// SEED RUNNER
// -----------------------------------------------------------------------------
async function seedNaturalReviews() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🚀 Starting Natural Reviews & Distinct Volume Overhaul...');

    const targets = [
      { slug: 'barri', reviews: getBarriReviews(), casesCount: 6, observed: 18400, invited: 16900 },
      { slug: 'gogym', reviews: getGoGymReviews(), casesCount: 6, observed: 14200, invited: 13100 },
      { slug: 'doctormx', reviews: getDoctorReviews(), casesCount: 6, observed: 9800, invited: 8900 },
      { slug: 'bien', reviews: getBienReviews(), casesCount: 6, observed: 24500, invited: 23100 },
      { slug: 'hablo', reviews: getHabloReviews(), casesCount: 6, observed: 8600, invited: 7800 }
    ];

    for (const t of targets) {
      // 1. Fetch business
      const bRes = await client.query('SELECT id, brand_name FROM businesses WHERE slug = $1', [t.slug]);
      if (bRes.rows.length === 0) {
        console.warn(`⚠️ Business ${t.slug} not found, skipping.`);
        continue;
      }
      const businessId = bRes.rows[0].id;
      const brandName = bRes.rows[0].brand_name;

      console.log(`\n📦 Processing ${brandName} (${t.slug}, ID: ${businessId}) -> ${t.reviews.length} natural reviews...`);

      // 2. Clear old synthetic reviews and related orders/invitations
      await client.query('DELETE FROM reviews WHERE business_id = $1', [businessId]);
      await client.query('DELETE FROM invitations WHERE business_id = $1', [businessId]);
      await client.query('DELETE FROM orders WHERE business_id = $1', [businessId]);

      // 3. Insert fresh natural orders, invitations, and reviews
      for (let i = 0; i < t.reviews.length; i++) {
        const rev = t.reviews[i];
        const orderRes = await client.query(
          `INSERT INTO orders (
            business_id, external_order_id, platform, customer_name,
            customer_email, amount, currency, status, invited, order_date, delivered_date
          ) VALUES ($1, $2, 'stripe', $3, $4, $5, 'MXN', 'delivered', true, NOW() - ($6 || ' days')::INTERVAL, NOW() - ($6 || ' days')::INTERVAL) RETURNING id`,
          [
            businessId,
            `ORD-${t.slug.toUpperCase()}-2026-${1000 + i}`,
            rev.author_name,
            rev.author_masked_contact,
            t.slug === 'barri' ? 380.00 : (t.slug === 'bien' ? 3900.00 : 750.00),
            rev.ageDays + 1
          ]
        );
        const orderId = orderRes.rows[0].id;

        const invRes = await client.query(
          `INSERT INTO invitations (business_id, order_id, token, channel, recipient_target, status, sent_at, completed_at)
           VALUES ($1, $2, $3, 'whatsapp', $4, 'completed', NOW() - ($5 || ' days')::INTERVAL, NOW() - ($6 || ' days')::INTERVAL) RETURNING id`,
          [
            businessId,
            orderId,
            `inv_${t.slug}_nat_${i}_${Date.now()}`,
            rev.author_masked_contact,
            rev.ageDays + 1,
            rev.ageDays
          ]
        );
        const invitationId = invRes.rows[0].id;

        const revRes = await client.query(
          `INSERT INTO reviews (
            business_id, order_id, invitation_id, rating, title, body, author_name,
            author_masked_contact, verification_level, score_weight,
            integrity_factor, product_name, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'published', NOW() - ($13 || ' days')::INTERVAL) RETURNING id`,
          [
            businessId,
            orderId,
            invitationId,
            rev.rating,
            rev.title,
            rev.body,
            rev.author_name,
            rev.author_masked_contact,
            rev.verification_level,
            rev.verification_level === 'confirmed_payment' ? 1.00 : 0.90,
            1.00,
            rev.product_name,
            rev.ageDays
          ]
        );

        if (rev.response) {
          await client.query(
            `INSERT INTO review_responses (review_id, business_id, responder_name, response_text, created_at)
             VALUES ($1, $2, 'Equipo Oficial ${brandName}', $3, NOW() - ($4 || ' days')::INTERVAL)`,
            [revRes.rows[0].id, businessId, rev.response, rev.ageDays]
          );
        }
      }

      // 4. Calculate Opinio Score using Bayesian engine
      const reviewCalcItems: ReviewCalculationItem[] = t.reviews.map(r => ({
        rating: r.rating,
        verificationLevel: r.verification_level,
        ageDays: r.ageDays,
        integrityFactor: 1.00
      }));

      const resolutionInput: ResolutionMetricsInput = {
        casesCount: t.casesCount,
        consumerConfirmedCount: t.casesCount,
        merchantRespondedCount: t.casesCount,
        medianResponseHours: 0.8,
        reopenedCount: 0
      };

      const calculated = calculateOpinioScore(
        reviewCalcItems,
        resolutionInput,
        t.observed,
        t.invited,
        78.0,
        20
      );

      // 5. Update business record
      await client.query(
        `UPDATE businesses SET
          trust_score = $1,
          confidence_level = $2,
          effective_reviews_count = $3,
          coverage_percentage = $4,
          issues_per_thousand = $5,
          resolution_rate = $6,
          updated_at = NOW()
        WHERE id = $7`,
        [
          calculated.opinioScore,
          calculated.confidenceLevel,
          Math.round(calculated.effectiveSampleSize),
          95.2,
          calculated.issuesPerThousand,
          calculated.resolutionRate,
          businessId
        ]
      );

      // 6. Ensure active ribbon widget token exists and is valid
      await client.query(
        `INSERT INTO widgets (business_id, token, widget_type, config, is_active)
         VALUES ($1, $2, 'ribbon', '{"style":"ribbon"}'::jsonb, true)
         ON CONFLICT (token) DO UPDATE SET is_active = true, config = '{"style":"ribbon"}'::jsonb`,
        [businessId, `wgt_${t.slug}_ribbon_2026`]
      );

      const avgRating = (t.reviews.reduce((acc, r) => acc + r.rating, 0) / t.reviews.length).toFixed(2);
      console.log(`✨ ${brandName}: ${t.reviews.length} reviews | Avg: ${avgRating}★ | Opinio Score: ${calculated.opinioScore}/100`);
    }

    await client.query('COMMIT');
    console.log('\n🎉 ALL SISTER BUSINESSES SUCCESSFULLY RE-SEEDED WITH NATURAL REVIEWS!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Re-seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedNaturalReviews();
