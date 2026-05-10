import * as hlp from "./helper";

function isWord(result: hlp.Result): boolean {
  return result.file_name.includes("word");
}

function isPp(result: hlp.Result): boolean {
  return result.file_name.includes("pp");
}

function isExcel(result: hlp.Result): boolean {
  return result.file_name.includes("excel");
}

function isMammoth(result: hlp.Result): boolean {
  return result.method.includes("mammoth");
}

function isGotenberg(result: hlp.Result): boolean {
  return result.method.includes("gotenberg");
}

function isOk(result: hlp.Result): boolean {
  return result.ok;
}

function time(result: hlp.Result): number {
  return hlp.assertDefined(
    result.time_ms,
    "runtime is not defined. Probably the result was not ok",
  );
}

function filterByCriteria(
  results: hlp.Result[],
  criteria: Array<(res: hlp.Result) => boolean>,
) {
  return results.filter((res) => criteria.every((fn) => fn(res)));
}

function getStats(results: Array<hlp.Result>) {
  if (results.length === 0) {
    return { mean: 0, min: 0, max: 0 };
  }
  const nums = filterByCriteria(results, [isOk]).map((r) =>
    hlp.assertDefined(r.time_ms, "time_ms must be defined"),
  );

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const sum = nums.reduce((acc, val) => acc + val, 0);
  const mean = sum / nums.length;

  return { mean, min, max };
}

export function printStatistics(results: Array<hlp.Result>) {
  //console.log(JSON.stringify(results, null, 2));
  console.log("\n\n");
  let allMammoth = filterByCriteria(results, [isMammoth]).length;
  let okMammoth = filterByCriteria(results, [isMammoth, isOk]).length;
  console.log(`Mammoth   ok: ${okMammoth} of ${allMammoth}`);
  const {
    mean: meanMammoth,
    min: minMammoth,
    max: maxMammoth,
  } = getStats(filterByCriteria(results, [isMammoth, isOk]));
  console.log(
    `Mammoth   runtime[ms]: mean:${meanMammoth.toFixed(1)} min:${minMammoth.toFixed(1)} max:${maxMammoth.toFixed(1)}`,
  );

  let allGotenberg = filterByCriteria(results, [isGotenberg]).length;
  let okGotenberg = filterByCriteria(results, [isGotenberg, isOk]).length;
  console.log(`Gotenberg ok: ${okGotenberg} of ${allGotenberg}`);

  const {
    mean: meanGotenberg,
    min: minGotenberg,
    max: maxGotenberg,
  } = getStats(filterByCriteria(results, [isGotenberg, isOk]));
  console.log(
    `Gotenberg runtime[ms]: mean:${meanGotenberg.toFixed(1)} min:${minGotenberg.toFixed(1)} mean:${maxGotenberg.toFixed(1)}`,
  );
  console.log("\n\n");
}
