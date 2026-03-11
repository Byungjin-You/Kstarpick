import mongoose from 'mongoose';
import dbConnect from '../../../../lib/dbConnect';
import Review from '../../../../models/Review';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category || null; // 'drama' or 'movie'

    const db = mongoose.connection.db;

    // category 필터가 있으면 해당 카테고리의 드라마 slug 목록을 먼저 조회
    let allowedMdlNames = null;
    if (category) {
      const dramas = await db.collection('dramas')
        .find({ category })
        .project({ slug: 1 })
        .toArray();
      // slug에서 mdl 이름 추출 (예: "the-first-ride-910071" → "first-ride")
      // sourceUrl 매칭을 위해 slug 전체를 저장
      allowedMdlNames = new Set();
      for (const d of dramas) {
        if (d.slug) allowedMdlNames.add(d.slug);
      }
    }

    // 충분한 리뷰를 가져온 후 필터링
    const fetchLimit = category ? limit * 5 : limit;
    const reviews = await Review.find({ rating: { $gte: 7 } })
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .select('username rating title reviewText dramaId sourceUrl createdAt')
      .lean();

    // sourceUrl에서 mdl 이름 추출 후 Drama 컬렉션의 slug 매칭
    const mdlNames = [...new Set(reviews.map(r => {
      if (!r.sourceUrl) return null;
      const match = r.sourceUrl.match(/mydramalist\.com\/\d+-([^/]+)/);
      return match ? match[1] : null;
    }).filter(Boolean))];

    const dramaSlugMap = {};
    const dramaCategoryMap = {};
    for (const name of mdlNames) {
      const drama = await db.collection('dramas').findOne(
        { slug: new RegExp(name, 'i') },
        { projection: { slug: 1, category: 1 } }
      );
      if (drama) {
        dramaSlugMap[name] = drama.slug;
        dramaCategoryMap[name] = drama.category;
      }
    }

    // 리뷰에 slug 매핑 + category 필터링
    const mappedReviews = [];
    for (const r of reviews) {
      let dramaSlug = null;
      let mdlName = null;
      if (r.sourceUrl) {
        const match = r.sourceUrl.match(/mydramalist\.com\/\d+-([^/]+)/);
        if (match && dramaSlugMap[match[1]]) {
          mdlName = match[1];
          dramaSlug = dramaSlugMap[match[1]];
        }
      }

      // category 필터 적용
      if (category && mdlName) {
        if (dramaCategoryMap[mdlName] !== category) continue;
      } else if (category && !mdlName) {
        continue;
      }

      mappedReviews.push({
        _id: r._id,
        username: r.username,
        rating: r.rating,
        dramaTitle: r.title,
        content: r.reviewText ? r.reviewText.substring(0, 100) : '',
        dramaId: r.dramaId,
        dramaSlug,
        createdAt: r.createdAt,
      });

      if (mappedReviews.length >= limit) break;
    }

    return res.status(200).json({
      success: true,
      data: mappedReviews
    });
  } catch (error) {
    console.error('Recent reviews fetch error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
