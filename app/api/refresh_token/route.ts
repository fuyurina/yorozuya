import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { refreshAllTokens } from '@/app/services/useTokenRefresh';

const handler: NextApiHandler = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await refreshAllTokens();
      res.status(200).json({ message: 'Semua token berhasil di-refresh' });
    } catch (error) {
      res.status(500).json({ error: 'Gagal me-refresh token' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default handler;
