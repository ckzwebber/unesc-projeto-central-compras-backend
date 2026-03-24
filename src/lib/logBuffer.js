const MAX_LOGS = 500;
const logs = [];

function addLog(log) {
  logs.push(log);
  if (logs.length > MAX_LOGS) logs.shift();
}

function getLogs({ limit = 100, method, status, path } = {}) {
  let result = [...logs].reverse();

  if (method) result = result.filter((l) => l.req?.method === method.toUpperCase());
  if (path) result = result.filter((l) => l.req?.path?.includes(path));
  if (status) {
    const s = Number(status);
    result = result.filter((l) => {
      const code = l.res?.statusCode;
      if (status === "2xx") return code >= 200 && code < 300;
      if (status === "4xx") return code >= 400 && code < 500;
      if (status === "5xx") return code >= 500;
      return code === s;
    });
  }

  return result.slice(0, Number(limit));
}

module.exports = { addLog, getLogs };
