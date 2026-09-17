const login = async () => {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ava@keystone.app', password: 'keystone123' }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error('login failed: ' + JSON.stringify(body));
  }

  return body.accessToken;
};

const listProjects = async (token) => {
  const res = await fetch('http://localhost:5000/api/projects', {
    headers: { Authorization: 'Bearer ' + token },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error('project list failed: ' + JSON.stringify(body));
  }

  return body.projects;
};

const addMessage = async (token, projectId, payload) => {
  const res = await fetch(`http://localhost:5000/api/projects/${projectId}/messages`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error('message failed: ' + JSON.stringify(body));
  }

  return body.message;
};

const analyze = async (token, projectId) => {
  const res = await fetch(`http://localhost:5000/api/projects/${projectId}/analyze`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error('analysis failed: ' + JSON.stringify(body));
  }

  return body;
};

const fetchData = async (token, url) => {
  const res = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error('request failed: ' + url + ' ' + JSON.stringify(body));
  }

  return body;
};

try {
  const token = await login();
  const projects = await listProjects(token);
  const project = projects.find((item) => item.name === 'Frontend QA Project');

  if (!project) {
    throw new Error('Frontend QA Project not found');
  }

  const payloads = [
    {
      channel: 'whatsapp',
      sender: 'Ava',
      content: 'We approved the revised ceiling finish for the lobby. Please proceed with the install next Tuesday.',
      timestamp: new Date().toISOString(),
    },
    {
      channel: 'email',
      sender: 'Leo',
      content: 'Final sign-off says keep the original wall tiles. The revised finish is only for the lobby ceiling and not the full corridor.',
      timestamp: new Date(Date.now() + 60000).toISOString(),
    },
    {
      channel: 'site',
      sender: 'Ravi',
      content: 'Please confirm the finish decision by Friday or the install will be delayed.',
      timestamp: new Date(Date.now() + 120000).toISOString(),
    },
    {
      channel: 'whatsapp',
      sender: 'Ava',
      content: 'Confirmed: keep original wall tiles, but proceed with revised lobby ceiling finish once the site team confirms the delivery window.',
      timestamp: new Date(Date.now() + 180000).toISOString(),
    },
  ];

  for (const payload of payloads) {
    await addMessage(token, project._id, payload);
    console.log('message_ok', payload.sender);
  }

  const analysis = await analyze(token, project._id);
  const actions = await fetchData(token, `http://localhost:5000/api/projects/${project._id}/actions`);
  const decisions = await fetchData(token, `http://localhost:5000/api/projects/${project._id}/decisions`);
  const conflicts = await fetchData(token, `http://localhost:5000/api/projects/${project._id}/conflicts`);

  console.log('analyze_status', 200);
  console.log('summary', analysis.digest?.summaryText ?? 'NO_SUMMARY');
  console.log('actions', actions.actions?.length ?? 0);
  console.log('decisions', decisions.decisions?.length ?? 0);
  console.log('conflicts', conflicts.conflicts?.length ?? 0);
} catch (error) {
  console.error('CHECK_FAILED', error.message);
  process.exit(1);
}
