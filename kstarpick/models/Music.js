import mongoose from 'mongoose';
import slugify from 'slugify';

const MusicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, '음악 제목을 입력해주세요.'],
      trim: true
    },
    slug: {
      type: String,
      unique: true,
      index: true
    },
    artist: {
      type: String,
      required: [true, '아티스트 이름을 입력해주세요.'],
      trim: true
    },
    album: {
      type: String,
      trim: true
    },
    releaseDate: {
      type: Date,
      required: [true, '발매일을 입력해주세요.']
    },
    genre: {
      type: [String],
      required: [true, '적어도 하나의 장르를 선택해주세요.'],
      enum: ['kpop', 'ballad', 'dance', 'hiphop', 'rnb', 'rock', 'indie', 'trot', 'ost']
    },
    description: {
      type: String,
      trim: true
    },
    lyrics: {
      type: String,
      trim: true
    },
    coverImage: {
      type: String,
      required: [true, '앨범 커버 이미지를 입력해주세요.']
    },
    audioUrl: {
      type: String
    },
    musicVideo: {
      type: String
    },
    position: {
      type: Number,
      default: 99
    },
    previousPosition: {
      type: Number,
      default: 99
    },
    featured: {
      type: Boolean,
      default: false
    },
    likes: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    dailyViews: {
      type: Number,
      default: 0
    },
    dailyview: {
      type: Number,
      default: 0
    },
    dailyView: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// 슬러그 생성 및 업데이트
MusicSchema.pre('save', function(next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(`${this.title}-${this.artist}`, { 
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  next();
});

// position과 previousPosition이 항상 숫자로 처리되도록 설정
MusicSchema.pre('save', function(next) {
  // position이 없거나 숫자가 아니면 기본값 99 설정
  if (this.position === undefined || this.position === null || isNaN(this.position)) {
    this.position = 99;
  } else if (typeof this.position !== 'number') {
    // 문자열이면 숫자로 변환
    this.position = parseInt(this.position) || 99;
  }

  // previousPosition이 없거나 숫자가 아니면 position 값 사용
  if (this.previousPosition === undefined || this.previousPosition === null || isNaN(this.previousPosition)) {
    this.previousPosition = this.position;
  } else if (typeof this.previousPosition !== 'number') {
    // 문자열이면 숫자로 변환
    this.previousPosition = parseInt(this.previousPosition) || this.position;
  }

  next();
});

// 모델이 JSON으로 직렬화될 때 필드 보장
MusicSchema.set('toJSON', {
  transform: function(doc, ret) {
    // position 필드가 항상 숫자로 반환되도록 보장
    if (ret.position === undefined || ret.position === null || isNaN(ret.position)) {
      ret.position = 99;
    } else if (typeof ret.position !== 'number') {
      ret.position = parseInt(ret.position) || 99;
    }

    // previousPosition 필드가 항상 숫자로 반환되도록 보장
    if (ret.previousPosition === undefined || ret.previousPosition === null || isNaN(ret.previousPosition)) {
      ret.previousPosition = ret.position;
    } else if (typeof ret.previousPosition !== 'number') {
      ret.previousPosition = parseInt(ret.previousPosition) || ret.position;
    }

    return ret;
  }
});

// 모델이 존재하는 경우 재사용
export default mongoose.models.Music || mongoose.model('Music', MusicSchema); 