const info = (msg: string, meta?: Record<string, unknown>) => {
  const payload = { level: 'info', message: msg, timestamp: new Date().toISOString(), ...meta };
  console.log(JSON.stringify(payload));
};

const error = (msg: string, meta?: Record<string, unknown>) => {
  const payload = { level: 'error', message: msg, timestamp: new Date().toISOString(), ...meta };
  console.error(JSON.stringify(payload));
};

export default { info, error };
