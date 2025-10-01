import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // 로깅 추가
  console.log(`[Comment API] Received ${req.method} request for ${req.url}`);
  
  // GET 요청(댓글 조회)은 인증 없이 허용
  if (req.method === 'GET') {
    return getComments(req, res);
  }
  
  // POST 요청(댓글 추가)은 게스트도 허용
  if (req.method === 'POST') {
    return addComment(req, res);
  }
  
  // DELETE 요청은 인증 필요
  const session = await getSession({ req });
  if (!session) {
    console.log('[Comment API] Authentication failed: No session found');
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  console.log(`[Comment API] Authenticated as user: ${session.user.email} (${session.user.id})`);
  
  // Handle DELETE request (delete a comment)
  if (req.method === 'DELETE') {
    return deleteComment(req, res, session);
  }
  
  else {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

// 댓글 조회 처리 함수
async function getComments(req, res) {
  try {
    console.log(`[Comment API] Getting comments for news ID: ${req.query.id}`);
    
    const { id, page = 1, limit = 10 } = req.query;
    
    if (!id) {
      return res.status(400).json({ success: false, message: 'News ID is required' });
    }

    // Check if news article exists
    const { db } = await connectToDatabase();
    let newsArticle;
    let newsId;
    
    try {
      if (ObjectId.isValid(id)) {
        newsArticle = await db.collection('news').findOne({ _id: new ObjectId(id) });
        newsId = newsArticle?._id;
      }
      
      if (!newsArticle) {
        newsArticle = await db.collection('news').findOne({ slug: id });
        newsId = newsArticle?._id;
      }
    } catch (error) {
      console.error('[Comment API] Error finding news article:', error);
    }
    
    if (!newsArticle) {
      console.log(`[Comment API] News article not found for ID: ${id}`);
      return res.status(404).json({ success: false, message: 'News article not found' });
    }

    console.log(`[Comment API] Found news article: ${newsArticle.title}`);
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get comments using native MongoDB driver instead of Mongoose
    const comments = await db.collection('comments')
      .find({ 
        contentId: newsId instanceof ObjectId ? newsId : new ObjectId(newsId), 
        contentType: 'news' 
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
      
    // Get user information for comments with authors
    const userIds = comments
      .filter(comment => comment.author)
      .map(comment => {
        try {
          return new ObjectId(comment.author);
        } catch (error) {
          console.error(`[Comment API] Invalid author ID: ${comment.author}`);
          return null;
        }
      })
      .filter(id => id !== null);
      
    let users = [];
    if (userIds.length > 0) {
      users = await db.collection('users').find({ 
        _id: { $in: userIds } 
      }).toArray();
    }
    
    // Map user information to comments
    const populatedComments = comments.map(comment => {
      if (comment.author) {
        // 로그인 사용자 댓글
        const user = users.find(u => u._id.toString() === comment.author.toString());
        return {
          ...comment,
          author: user ? {
            _id: user._id,
            name: user.name,
            image: user.image || '/images/default-avatar.png',
            isGuest: false
          } : { name: 'Unknown User', image: '/images/default-avatar.png', isGuest: false }
        };
      } else {
        // 게스트 사용자 댓글
        console.log('Guest comment found:', comment);
        return {
          ...comment,
          author: { 
            name: comment.guestName || 'Guest', 
            image: '/images/default-avatar.png',
            isGuest: true 
          }
        };
      }
    });

    console.log(`[Comment API] Found ${comments.length} comments`);
    
    // 게스트 댓글 확인용 로그
    populatedComments.forEach((comment, index) => {
      if (!comment.author._id) {
        console.log(`[Comment API] Guest comment #${index}:`, {
          name: comment.author.name,
          guestName: comment.guestName,
          isGuest: comment.isGuest || comment.author.isGuest
        });
      }
    });

    // Get total count for pagination
    const total = await db.collection('comments').countDocuments({ 
      contentId: newsId instanceof ObjectId ? newsId : new ObjectId(newsId), 
      contentType: 'news'
    });

    return res.status(200).json({
      success: true,
      comments: populatedComments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[Comment API] Error getting comments:', error);
    return res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
}

// 댓글 추가 처리 함수
async function addComment(req, res) {
  try {
    console.log('[Comment API] Adding new comment');
    console.log('[Comment API] Raw request body:', req.body);
    
    const { id, content, guestName } = req.body;

    if (!id || !content) {
      console.log('[Comment API] Missing required fields:', { id, content });
      return res.status(400).json({ 
        success: false, 
        message: 'News ID and comment content are required' 
      });
    }

    // Validate content length
    if (content.trim().length < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Comment cannot be empty' 
      });
    }

    // Check if news article exists
    const { db } = await connectToDatabase();
    let newsArticle;
    
    try {
      if (ObjectId.isValid(id)) {
        newsArticle = await db.collection('news').findOne({ _id: new ObjectId(id) });
      }
      
      if (!newsArticle) {
        newsArticle = await db.collection('news').findOne({ slug: id });
      }
    } catch (error) {
      console.error('[Comment API] Error finding news article:', error);
    }
    
    if (!newsArticle) {
      console.log(`[Comment API] News article not found for ID: ${id}`);
      return res.status(404).json({ success: false, message: 'News article not found' });
    }

    console.log(`[Comment API] Found news article: ${newsArticle.title}`);
    
    // Get session to check if user is logged in
    const session = await getSession({ req });
    let userId = null;
    let userName = null;
    let finalGuestName = null;
    
    // If logged in, use user information
    if (session && session.user) {
      console.log(`[Comment API] User is logged in: ${session.user.email}`);
      
      // Find user in database
      const user = await db.collection('users').findOne({ email: session.user.email });
      if (user) {
        userId = user._id;
        userName = user.name;
      }
    } else {
      // 게스트 이름 처리
      finalGuestName = guestName && guestName.trim() ? guestName.trim() : generateRandomGuestName();
      console.log(`[Comment API] Adding as guest comment with name: ${finalGuestName}`);
    }

    const newsId = newsArticle._id instanceof ObjectId ? newsArticle._id : new ObjectId(newsArticle._id);
    
    // Create comment with MongoDB native driver
    const comment = {
      content: content.trim(),
      contentId: newsId,
      contentType: 'news',
      createdAt: new Date()
    };
    
    // If logged in, associate with user
    if (userId) {
      comment.author = userId;
    } 
    // If not logged in, use guest name (or default to 'Guest')
    else {
      comment.guestName = finalGuestName;
      comment.isGuest = true;
    }
    
    const result = await db.collection('comments').insertOne(comment);
    console.log(`[Comment API] Comment saved with ID: ${result.insertedId}`);

    // Get the saved comment with additional information
    const savedComment = await db.collection('comments').findOne({ _id: result.insertedId });
    
    // Prepare response
    const responseComment = {
      ...savedComment,
      author: userId ? {
        _id: userId,
        name: userName || 'User',
        image: session?.user?.image || '/images/default-avatar.png'
      } : {
        name: finalGuestName,
        image: '/images/default-avatar.png', 
        isGuest: true
      }
    };

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: responseComment
    });
  } catch (error) {
    console.error('[Comment API] Error adding comment:', error);
    return res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
}

// 랜덤 게스트 이름 생성 함수
function generateRandomGuestName() {
  const adjectives = ['Amazing', 'Bright', 'Cool', 'Dreamy', 'Elegant', 'Fancy', 'Glowing', 'Happy'];
  const nouns = ['Fan', 'Star', 'Angel', 'Melody', 'Voice', 'Heart', 'Artist', 'ARMY'];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 100);
  
  return `${randomAdjective}${randomNoun}${randomNumber}`;
}

// 댓글 삭제 처리 함수
async function deleteComment(req, res, session) {
  try {
    const { commentId } = req.body;
    console.log(`[Comment API] Deleting comment: ${commentId}`);
    
    if (!commentId) {
      return res.status(400).json({ success: false, message: 'Comment ID is required' });
    }

    const { db } = await connectToDatabase();
    
    // Find comment
    const comment = await db.collection('comments').findOne({ 
      _id: new ObjectId(commentId) 
    });
    
    if (!comment) {
      console.log(`[Comment API] Comment not found: ${commentId}`);
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Check if user is the author of the comment or an admin
    const isAuthor = comment.author && comment.author.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';
    
    if (!isAuthor && !isAdmin) {
      console.log(`[Comment API] Unauthorized delete attempt by ${session.user.id} for comment by ${comment.author}`);
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    // Delete comment
    await db.collection('comments').deleteOne({ _id: new ObjectId(commentId) });
    console.log(`[Comment API] Comment deleted: ${commentId}`);

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('[Comment API] Error deleting comment:', error);
    return res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
} 