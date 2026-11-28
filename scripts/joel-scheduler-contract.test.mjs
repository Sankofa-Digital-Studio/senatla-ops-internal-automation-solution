import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createContext, runInContext } from 'node:vm';

const html = readFileSync(new URL('../docs/joel-plant-demolition-wbs-scheduler.html', import.meta.url), 'utf8');
const inlineScripts = [...html.matchAll(/<script\s*>\s*([\s\S]*?)<\/script\s*>/gi)];
assert.equal(inlineScripts.length, 1, 'The scheduler has one standalone inline script');
const script = inlineScripts[0][1];

const domStart = script.indexOf('const masterStartDateInput =');
assert.ok(domStart > 0, 'The calendar runs before DOM setup');
const calendar = createContext({});
runInContext(script.slice(0, domStart), calendar);

test('the Joel scheduler excludes weekends, Easter holidays and Sunday-observed holidays', () => {
  for (const date of ['2027-03-26', '2027-03-27', '2027-03-28', '2027-03-29', '2027-03-22']) {
    assert.equal(runInContext(`isValidWorkingDay(parseDateParts(${JSON.stringify(date)}))`, calendar), false, date);
  }
  assert.equal(runInContext("isValidWorkingDay(parseDateParts('2027-03-30'))", calendar), true);
});

test('the Joel XML exporter escapes reserved characters and handles missing values', () => {
  const encoder = script.match(/function escapeXml\(unsafe\) \{[\s\S]*?\n    \}/)?.[0];
  assert.ok(encoder, 'The XML export encoder exists');
  const escapeXml = runInContext(encoder + '\nescapeXml', createContext({}));
  assert.equal(escapeXml('A&B <C> "D" \'E\''), 'A&amp;B &lt;C&gt; &quot;D&quot; &apos;E&apos;');
  assert.equal(escapeXml(null), '');
  assert.equal(escapeXml(undefined), '');
});

test('the Joel scheduler reopens on the first working day after the contractor shutdown', () => {
  assert.equal(runInContext("isValidWorkingDay(parseDateParts('2027-12-17'))", calendar), true);
  assert.equal(runInContext("isValidWorkingDay(parseDateParts('2027-12-20'))", calendar), false);
  assert.equal(runInContext("isValidWorkingDay(parseDateParts('2028-01-11'))", calendar), false);
  assert.equal(runInContext("isValidWorkingDay(parseDateParts('2028-01-12'))", calendar), true);
});
