import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://colleges-api-india.fly.dev';

export async function GET(req: NextRequest) {

  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword') || '';

  if (!keyword) {
    return NextResponse.json({ error: 'Missing keyword' }, { status: 400 });
  }

  // Validate input to prevent injection
  if (keyword.length > 100 || !/^[a-zA-Z0-9\s\-\.]+$/.test(keyword)) {
    return NextResponse.json({ error: 'Invalid keyword format' }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/colleges/search`, {
      method: 'POST',
      headers: {
        'Keyword': keyword,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch colleges' }, { status: 500 });
    }

    const data: string[][] = await res.json();

    // Extract only college names (3rd element in each array)
    const collegeNames = data.map(item => item[2]);
    collegeNames.push('R.K. University');
    collegeNames.push('Ganpat University');

    // Sort by relevance: starts-with matches first, then contains, alphabetically within each group
    const lowerKeyword = keyword.toLowerCase();
    collegeNames.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aStarts = aLower.startsWith(lowerKeyword);
      const bStarts = bLower.startsWith(lowerKeyword);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    });

    // Limit results for better UX
    const limited = collegeNames.slice(0, 20);

    return NextResponse.json({ colleges: limited });
  } catch (error) {
    console.error('Error fetching colleges:', error);
    return NextResponse.json({ error: 'Failed to fetch colleges' }, { status: 500 });
  }
}
