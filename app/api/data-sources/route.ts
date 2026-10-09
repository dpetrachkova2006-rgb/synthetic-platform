import snapshot from '../../data/worldbank-rus-2024.json';
import { demographicCells, STATISTICAL_SOURCE } from '../../lib/statisticalData';
export async function GET() { return Response.json({source:STATISTICAL_SOURCE,cells:demographicCells(),indicators:snapshot.rows,license:'CC BY 4.0',otherCharacteristics:'modeled'}, {headers:{'Cache-Control':'public, max-age=86400'}}); }
