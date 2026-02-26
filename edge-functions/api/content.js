import contentful from 'contentful';

// this code runs on the Edge/Server where process.env variables are available
const client = contentful.createClient({
  space: process.env.space,
  accessToken: process.env.accessToken,
});

export default async function handler(req, res) {
  const { type, order } = req.query;
  try {
    const entries = await client.getEntries({
      content_type: type,
      ...(order ? { order } : {}),
    });
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
