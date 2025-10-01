const mongoose = require('mongoose');
const { Schema } = mongoose;

const DramaSchema = new Schema({
  title: {
    type: String,
    required: [true, '제목이 필요합니다.'],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, '슬러그(URL)가 필요합니다.'],
    unique: true,
    trim: true,
  },
  originalTitle: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  summary: {
    type: String,
    trim: true,
  },
  coverImage: {
    type: String,
    trim: true,
  },
  bannerImage: {
    type: String,
    trim: true,
  },
  releaseDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  episodes: {
    type: Number,
  },
  // 에피소드 상세 정보 추가
  episodeList: [{
    number: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      trim: true
    },
    airDate: {
      type: Date
    },
    summary: {
      type: String,
      trim: true
    },
    runtime: {
      type: Number
    },
    rating: {
      type: Number,
      min: 0,
      max: 10
    },
    viewerRating: {
      type: Number,
      min: 0,
      max: 100
    },
    image: {
      type: String,
      trim: true
    },
    mdlUrl: {
      type: String,
      trim: true
    }
  }],
  country: {
    type: String,
    default: 'South Korea',
  },
  status: {
    type: String,
    enum: ['ongoing', 'completed', 'upcoming', 'cancelled'],
    default: 'upcoming',
  },
  type: {
    type: String,
    trim: true,
  },
  airsOn: {
    type: String,
    trim: true,
  },
  network: {
    type: String,
    trim: true,
  },
  runtime: {
    type: String,
    trim: true,
  },
  contentRating: {
    type: String,
    trim: true,
  },
  reviewRating: {
    type: Number,
    min: 0,
    max: 10,
  },
  category: {
    type: String,
    enum: ['drama', 'movie'],
    default: 'drama',
  },
  cast: [{
    name: String,
    role: String,
    image: String,
  }],
  // 확장된 Cast & Credits 정보
  credits: {
    directors: [{
      name: String,
      role: String,
      image: String,
      link: String
    }],
    writers: [{
      name: String,
      role: String,
      image: String,
      link: String
    }],
    mainCast: [{
      name: String,
      role: String,
      character: String,
      image: String,
      link: String
    }],
    supportCast: [{
      name: String,
      role: String,
      character: String,
      image: String,
      link: String
    }],
    guestCast: [{
      name: String,
      role: String,
      character: String,
      image: String,
      link: String,
      episodes: String
    }],
    others: [{
      name: String,
      role: String,
      character: String,
      image: String,
      link: String,
      category: String
    }]
  },
  genres: [String],
  tags: [String],
  // MyDramaList 관련 필드
  mdlId: {
    type: String,
    trim: true,
  },
  mdlUrl: {
    type: String,
    trim: true,
  },
  mdlSlug: {
    type: String,
    trim: true,
  },
  // Where to Watch 정보 필드 추가
  whereToWatch: [{
    name: String,
    link: String,
    imageUrl: String,
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Drama || mongoose.model('Drama', DramaSchema); 