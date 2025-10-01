import { useState } from 'react';
import { useSession } from 'next-auth/react';
import AdminLayout from '../../../components/AdminLayout';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Rating,
  Chip,
} from '@mui/material';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import SyncIcon from '@mui/icons-material/Sync';
import ErrorIcon from '@mui/icons-material/Error';
import { useRouter } from 'next/router';
import Head from 'next/head';
import useSWR from 'swr';

// 드라마 데이터 가져오기
const fetcher = async (url) => {
  // 인증 토큰 가져오기
  const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
  
  const res = await fetch(url, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    }
  });
  if (!res.ok) {
    throw new Error('드라마 데이터를 가져오는 중 오류가 발생했습니다.');
  }
  return res.json();
};

export default function ReviewsCrawlerPage() {
  // 인증 상태 확인
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // 스텔스 크롤러 상태
  const [url, setUrl] = useState('');
  const [selectedDrama, setSelectedDrama] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  
  // 드라마 데이터 가져오기
  const { data: dramas, error: dramasError } = useSWR('/api/dramas?limit=100', fetcher);
  
  // 로딩 중인 경우
  if (status === 'loading') {
    return (
      <AdminLayout>
        <Container>
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
            <CircularProgress />
          </Box>
        </Container>
      </AdminLayout>
    );
  }
  
  // 인증되지 않은 경우 로그인 페이지로 리디렉션
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }
  
  // 관리자가 아닌 경우 접근 거부
  if (session?.user?.role !== 'admin') {
    return (
      <AdminLayout>
        <Container>
          <Alert severity="error" sx={{ mt: 3 }}>
            이 페이지는 관리자만 접근할 수 있습니다.
          </Alert>
        </Container>
      </AdminLayout>
    );
  }
  
  // 입력 필드 변경 핸들러
  const handleUrlChange = (e) => {
    setUrl(e.target.value);
    
    // 오류 및 성공 메시지 초기화
    setErrorMsg('');
    setSuccessMsg('');
  };
  
  // 드라마 선택 핸들러
  const handleDramaChange = (e) => {
    setSelectedDrama(e.target.value);
  };
  
  // 스텔스 크롤링 시작 핸들러
  const handleStealthCrawling = async () => {
    // 입력 유효성 검사
    if (!url) {
      setErrorMsg('URL을 입력해주세요.');
      return;
    }
    
    if (!selectedDrama) {
      setErrorMsg('드라마를 선택해주세요.');
      return;
    }
    
    // URL 형식 확인
    if (!url.includes('mydramalist.com')) {
      setErrorMsg('MyDramalist 웹사이트 URL이어야 합니다.');
      return;
    }
    
    try {
      // 상태 초기화
      setIsLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      setReviews([]);
      
      console.log('API 요청 시작:', {
        url,
        dramaId: selectedDrama
      });
      
      // 스텔스 크롤러 API 호출
      const response = await fetch('/api/crawler/reviews-stealth-crawler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          dramaId: selectedDrama,
        }),
      });
      
      console.log('API 응답 상태:', response.status, response.statusText);
      
      // 응답 처리
      const result = await response.json();
      console.log('API 응답 결과:', result);
      
      if (!response.ok) {
        throw new Error(result.message || result.error || '크롤링 중 오류가 발생했습니다.');
      }
      
      // 크롤링 성공 처리
      setSuccessMsg(`${result.message || '리뷰 크롤링이 성공적으로 완료되었습니다.'}`);
      
      // 리뷰 데이터 설정
      if (result.data && result.data.reviews) {
        setReviews(result.data.reviews);
      }
      
    } catch (error) {
      console.error('크롤링 오류:', error);
      setErrorMsg(error.message || '리뷰 크롤링 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AdminLayout>
      <Head>
        <title>MyDramalist 리뷰 스텔스 크롤러 | 관리자</title>
      </Head>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          MyDramalist 리뷰 스텔스 크롤러
        </Typography>
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            리뷰 크롤링
          </Typography>
          
          <Typography color="text.secondary" paragraph>
            MyDramalist에서 드라마/영화 리뷰를 스텔스 크롤링합니다. Cloudflare 보호를 우회하여 리뷰를 수집합니다.
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="MyDramalist 드라마 URL"
                placeholder="https://mydramalist.com/702271-weak-hero-season-2"
                helperText="예: https://mydramalist.com/702271-weak-hero-season-2 (리뷰 페이지는 자동으로 추가됩니다)"
                value={url}
                onChange={handleUrlChange}
                margin="normal"
                required
                disabled={isLoading}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel id="drama-select-label">드라마 선택</InputLabel>
                <Select
                  labelId="drama-select-label"
                  value={selectedDrama}
                  onChange={handleDramaChange}
                  label="드라마 선택"
                  disabled={isLoading || !dramas}
                >
                  {dramasError ? (
                    <MenuItem value="">
                      <em>드라마 목록을 불러오는데 실패했습니다</em>
                    </MenuItem>
                  ) : !dramas ? (
                    <MenuItem value="">
                      <em>로딩 중...</em>
                    </MenuItem>
                  ) : (
                    dramas.map((drama) => (
                      <MenuItem key={drama._id} value={drama._id}>
                        {drama.title}
                      </MenuItem>
                    ))
                  )}
                </Select>
                <FormHelperText>리뷰를 연결할 드라마를 선택하세요</FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-start' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
              onClick={handleStealthCrawling}
              disabled={isLoading}
            >
              {isLoading ? '크롤링 중...' : '스텔스 크롤링 시작'}
            </Button>
          </Box>
          
          {errorMsg && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorMsg}
            </Alert>
          )}
          
          {successMsg && (
            <Alert severity="success" sx={{ mt: 2 }} icon={<CloudDoneIcon />}>
              {successMsg}
            </Alert>
          )}
        </Paper>
        
        {reviews.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              수집된 리뷰 ({reviews.length}개)
            </Typography>
            
            <List>
              {reviews.map((review, index) => (
                <Box key={review.reviewId || `review-${index}`}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">{review.title}</Typography>
                          {review.rating > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Rating value={review.rating / 2} precision={0.5} readOnly />
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                ({review.rating}/10)
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Box sx={{ mb: 1, mt: 1 }}>
                            <Chip
                              size="small"
                              label={`작성자: ${review.username}`}
                              sx={{ mr: 1, mb: 1 }}
                            />
                            {review.reviewDate && (
                              <Chip
                                size="small"
                                label={`작성일: ${review.reviewDate}`}
                                sx={{ mr: 1, mb: 1 }}
                              />
                            )}
                            {review.helpfulCount > 0 && (
                              <Chip
                                size="small"
                                label={`좋아요: ${review.helpfulCount}`}
                                sx={{ mb: 1 }}
                              />
                            )}
                          </Box>
                          <Typography
                            variant="body2"
                            color="text.primary"
                            sx={{
                              display: '-webkit-box',
                              overflow: 'hidden',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 3,
                              textOverflow: 'ellipsis',
                              whiteSpace: 'pre-line',
                            }}
                          >
                            {review.reviewText}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {index < reviews.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Paper>
        )}
      </Container>
    </AdminLayout>
  );
} 