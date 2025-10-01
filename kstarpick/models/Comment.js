import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  contentType: {
    type: String,
    enum: ['news', 'tvfilm'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Comment || mongoose.model('Comment', CommentSchema); 