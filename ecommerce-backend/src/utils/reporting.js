const { Op } = require('sequelize');

/** Stock at or below this counts as "low" everywhere in the admin and seller panels. */
const LOW_STOCK_THRESHOLD = 5;

/** Buckets a sales series can be grouped into. */
const GROUP_OPTIONS = ['day', 'week', 'month', 'year'];

/** Statuses that still count as live business, i.e. everything but a cancellation. */
const LIVE_ORDER_WHERE = { status: { [Op.ne]: 'cancelled' } };

/** Start of the window for a named range, or null for "all time". */
function rangeStart(range) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === 'today') return start;
  if (range === 'week') {
    // Week starts on Monday.
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    return start;
  }
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === 'year') return new Date(now.getFullYear(), 0, 1);
  return null;
}

/**
 * Turns `?range=` / `?from=` / `?to=` into a Sequelize comparison object, or null
 * when the caller asked for everything. An explicit from/to always wins over a
 * named range, so a custom range never has to clear the dropdown first.
 */
function resolveDateWindow({ range, from, to } = {}) {
  if (from || to) {
    const window = {};
    if (from) window[Op.gte] = new Date(`${from}T00:00:00`);
    if (to) window[Op.lte] = new Date(`${to}T23:59:59`);
    return window;
  }

  const start = rangeStart(range);
  return start ? { [Op.gte]: start } : null;
}

/** `resolveDateWindow` as a ready-to-spread where clause for one column. */
function dateWhere(query, field = 'placedAt') {
  const window = resolveDateWindow(query);
  return window ? { [field]: window } : {};
}

/** The label a report should report back for the window it actually used. */
function describeRange({ range = 'all', from, to } = {}) {
  return from || to ? 'custom' : range;
}

const pad = (value) => String(value).padStart(2, '0');

/** MySQL DATETIME literal in local time, so it lines up with how rows were stored. */
function toSqlDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * The same window as a SQL fragment, for the correlated subqueries the seller and
 * product reports lean on. Returns '' when the report covers all time.
 */
function sqlDateWindow(query, column) {
  const window = resolveDateWindow(query);
  if (!window) return '';

  let clause = '';
  if (window[Op.gte]) clause += ` AND ${column} >= '${toSqlDate(window[Op.gte])}'`;
  if (window[Op.lte]) clause += ` AND ${column} <= '${toSqlDate(window[Op.lte])}'`;
  return clause;
}

/** SQL expression that buckets a datetime column into a sortable period key. */
function periodSql(groupBy, column) {
  switch (groupBy) {
    case 'year':
      return `DATE_FORMAT(${column}, '%Y')`;
    case 'month':
      return `DATE_FORMAT(${column}, '%Y-%m')`;
    case 'week':
      // Labelled by the Monday the week starts on, which also sorts correctly.
      return `DATE_FORMAT(DATE_SUB(${column}, INTERVAL WEEKDAY(${column}) DAY), '%Y-%m-%d')`;
    default:
      return `DATE_FORMAT(${column}, '%Y-%m-%d')`;
  }
}

function normaliseGroupBy(value) {
  return GROUP_OPTIONS.includes(value) ? value : 'day';
}

/** Advances a period key by one bucket, used to fill gaps in a series. */
function nextPeriod(period, groupBy) {
  if (groupBy === 'year') return String(Number(period) + 1);

  if (groupBy === 'month') {
    const [year, month] = period.split('-').map(Number);
    return month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
  }

  const date = new Date(`${period}T00:00:00`);
  date.setDate(date.getDate() + (groupBy === 'week' ? 7 : 1));
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Inserts zero rows for periods with no orders, so a sales chart shows a quiet
 * Tuesday as a dip rather than joining Monday straight to Wednesday. Capped so a
 * wide "all time" window cannot generate an unbounded series.
 */
function fillGaps(rows, groupBy, emptyRow, limit = 400) {
  if (rows.length < 2) return rows;

  const filled = [];
  for (let index = 0; index < rows.length; index += 1) {
    filled.push(rows[index]);
    if (index === rows.length - 1) break;

    let cursor = nextPeriod(rows[index].period, groupBy);
    let guard = 0;
    while (cursor < rows[index + 1].period && filled.length < limit && guard < limit) {
      filled.push({ ...emptyRow, period: cursor });
      cursor = nextPeriod(cursor, groupBy);
      guard += 1;
    }
    if (filled.length >= limit) break;
  }

  return filled;
}

module.exports = {
  LOW_STOCK_THRESHOLD,
  GROUP_OPTIONS,
  LIVE_ORDER_WHERE,
  rangeStart,
  resolveDateWindow,
  dateWhere,
  describeRange,
  toSqlDate,
  sqlDateWindow,
  periodSql,
  normaliseGroupBy,
  nextPeriod,
  fillGaps,
};
