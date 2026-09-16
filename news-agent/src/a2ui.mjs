/**
 * The score as a UI the client renders, not a paragraph it has to parse — A2UI v0.9 over the A2A extension.
 *
 * The four axes are already structured: two numbers with ranks, two verdicts with measured values, and a
 * list of the articles they were compared against. Rendering that as preformatted text throws the structure
 * away and makes every client re-derive it from prose. A2UI lets the agent describe the surface once and
 * every client — the ainize explorer, an AIN Teams channel, anything else — draw it natively.
 *
 * ## How it rides on A2A
 *
 * The agent declares the extension in `capabilities.extensions`, and each A2UI message travels as an A2A
 * `DataPart` whose metadata names the MIME type:
 *
 *   { kind: 'data', data: <a2ui message>, metadata: { mimeType: 'application/json+a2ui' } }
 *
 * A client that does not understand A2UI ignores those parts and reads the text part, which is always sent
 * alongside. The UI is an enrichment, never the only copy of the answer — an agent whose result is
 * unreadable without a renderer has made itself less useful, not more.
 *
 * ## v0.9 message order
 *
 * `createSurface` (which catalog, which surface) → `updateComponents` (the tree) → `updateDataModel` (the
 * values the tree points at). Components reference data by JSON Pointer, so the same tree re-renders when
 * only the data changes.
 */

export const A2UI_VERSION = 'v0.9';
export const A2UI_MIME = 'application/json+a2ui';
export const A2UI_EXTENSION_URI = 'https://a2ui.org/a2a-extension/a2ui/v0.8';
export const BASIC_CATALOG = 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json';

/** What the agent card advertises so a client knows it may expect A2UI parts. */
export const a2uiExtension = () => ({
  uri: A2UI_EXTENSION_URI,
  description: 'Emits the score as an A2UI surface alongside the text answer',
  required: false,
  params: { supportedCatalogIds: [BASIC_CATALOG], acceptsInlineCatalogs: false },
});

const text = (id, value, variant) => ({ id, component: 'Text', text: value, ...(variant ? { variant } : {}) });
const bind = (path) => ({ path });

/**
 * An A2A DataPart carrying one A2UI message, in the v1.0 part shape.
 *
 * v1.0 wraps every part as `content: { $case, value }`; the `{ kind: 'data', data }` spelling in the A2UI
 * extension document is v0.3, and the compat layer produces it on the way out. Emitting the v0.3 spelling
 * here is rejected as "Invalid v1.0 part: missing content" — the part looks right and the whole turn fails.
 */
export const a2uiPart = (message) => ({
  content: { $case: 'data', value: message },
  metadata: { mimeType: A2UI_MIME },
  mediaType: A2UI_MIME,
});

const MARK = { pass: '✓ pass', warn: '~ warn', fail: '✗ fail' };

/**
 * The component tree.
 *
 * Every value the tree shows is a JSON Pointer into the data model rather than a literal, so the same
 * surface can be updated in place, and so the numbers a client displays are demonstrably the numbers the
 * agent computed rather than a re-rendering of a sentence.
 */
function components(result) {
  const rows = [
    { id: 'title', label: '① Title' },
    { id: 'lead', label: '② Lead' },
    { id: 'read', label: '③ Readability' },
    { id: 'len', label: '④ Length' },
  ];

  const out = [
    { id: 'root', component: 'Column', children: ['headline', 'overall', 'axes', 'divider', 'refs'] },
    text('headline', 'News fitness', 'h2'),
    text('overall', bind('/overall_label'), 'h1'),
    { id: 'axes', component: 'Card', child: 'axes_col' },
    { id: 'axes_col', component: 'Column', children: rows.flatMap((r) => [`${r.id}_row`]) },
    { id: 'divider', component: 'Divider' },
    { id: 'refs', component: 'Column', children: ['refs_head', 'refs_list'] },
    text('refs_head', bind('/references_label'), 'h3'),
    {
      id: 'refs_list',
      component: 'List',
      // a template child: one row per item in the bound array, which is what keeps the tree fixed-size
      children: { template: { dataPath: '/references', componentId: 'ref_row' } },
    },
    { id: 'ref_row', component: 'Row', children: ['ref_outlet', 'ref_title'] },
    text('ref_outlet', bind('outlet')),
    text('ref_title', bind('title')),
  ];

  for (const r of rows) {
    out.push({ id: `${r.id}_row`, component: 'Row', children: [`${r.id}_label`, `${r.id}_value`] });
    out.push(text(`${r.id}_label`, r.label));
    out.push(text(`${r.id}_value`, bind(`/${r.id}`)));
  }
  return out;
}

/** The values the tree points at. Flat and literal — anything a client would otherwise have to parse. */
function dataModel(result) {
  const axis = (v) => {
    if (!v) return '—';
    if (v.status === 'skipped') return `skipped — ${v.reason}`;
    if (v.status === 'scoring_failed') return `could not score — ${v.error}`;
    return `${v.score}/100  (rank ${v.rank}/${v.of})`;
  };
  const refs = (result.reference?.matched ?? []).map((m) => ({
    outlet: m.outlet ?? '—',
    title: m.title ?? '',
    url: m.url ?? '',
  }));
  return {
    overall_label: result.overall === null ? 'not scored' : `${result.overall}/100`,
    title: axis(result.title),
    lead: axis(result.lead),
    read: `FK ${result.readability?.fk ?? '—'}  ${MARK[result.readability?.verdict] ?? ''}`
      + `  (target ${result.readability?.target?.[0]}–${result.readability?.target?.[1]})`,
    len: `${result.length?.words} words  ${MARK[result.length?.verdict] ?? ''}`
      + `  (target ${result.length?.target?.[0]}–${result.length?.target?.[1]})`,
    references_label: refs.length
      ? `Compared against ${refs.length} article${refs.length === 1 ? '' : 's'} on the same story`
      : 'No article on the same story was readable',
    references: refs,
  };
}

/**
 * The three messages, in order, for one scoring result.
 *
 * `surfaceId` is derived from the turn rather than fixed, so two results in one conversation are two
 * surfaces instead of one overwriting the other.
 */
export function a2uiMessages(result, { surfaceId = 'news-fitness' } = {}) {
  return [
    { version: A2UI_VERSION, createSurface: { surfaceId, catalogId: BASIC_CATALOG, theme: {}, sendDataModel: false } },
    { version: A2UI_VERSION, updateComponents: { surfaceId, components: components(result) } },
    { version: A2UI_VERSION, updateDataModel: { surfaceId, path: '/', value: dataModel(result) } },
  ];
}

/** The same three, wrapped as A2A DataParts ready to sit beside the text part. */
export const a2uiParts = (result, opts) => a2uiMessages(result, opts).map(a2uiPart);
