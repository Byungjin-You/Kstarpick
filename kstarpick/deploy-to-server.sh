#!/bin/bash

# EC2 서버 정보
EC2_HOST="43.202.38.79"
EC2_USER="ec2-user"
EC2_PATH="/doohub/service/kstarpick"
PEM_KEY="~/Desktop/key_kstarpick.pem"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 사용법 출력
usage() {
    echo -e "${BLUE}사용법: $0 [옵션] [파일/폴더...]${NC}"
    echo ""
    echo "옵션:"
    echo "  -a, --all          전체 프로젝트 업로드 (기본값)"
    echo "  -f, --files        특정 파일/폴더만 업로드"
    echo "  -r, --restart      PM2 재시작만 수행"
    echo "  -b, --build        빌드 후 재시작"
    echo "  -k, --kill-all     모든 프로세스 강제 종료 후 재시작"
    echo "  -c, --clear-cache  캐시 완전 삭제 후 재시작"
    echo "  -h, --help         도움말 출력"
    echo ""
    echo "예시:"
    echo "  $0                                    # 전체 프로젝트 업로드 (포트 충돌 자동 해결)"
    echo "  $0 -f pages/api/crawler/             # 특정 폴더만 업로드"
    echo "  $0 -f file1.js file2.js              # 특정 파일들만 업로드"
    echo "  $0 -r                                 # PM2 재시작만 (포트 충돌 자동 해결)"
    echo "  $0 -b                                 # 빌드 후 재시작 (완전 정리)"
    echo "  $0 -k                                 # 모든 프로세스 강제 종료 후 재시작"
    echo "  $0 -c                                 # 캐시 완전 삭제 후 재시작"
    echo "  $0 -k -b                              # 완전 정리 후 빌드 및 재시작 (권장)"
    exit 1
}

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 서버 연결 테스트
test_connection() {
    log_info "서버 연결 테스트 중..."
    if ssh -i $PEM_KEY -o ConnectTimeout=10 $EC2_USER@$EC2_HOST "echo 'Connection OK'" > /dev/null 2>&1; then
        log_success "서버 연결 성공"
        return 0
    else
        log_error "서버 연결 실패"
        return 1
    fi
}

# 모든 관련 프로세스 강제 종료 함수 (next-server 좀비 프로세스 대응 강화)
kill_all_processes() {
    log_info "모든 관련 프로세스 강제 종료 중..."
    ssh -i $PEM_KEY $EC2_USER@$EC2_HOST << 'EOF'
echo "🔍 현재 실행 중인 관련 프로세스 확인..."
ps aux | grep -E '(next|node|pm2|kstarpick|13001)' | grep -v grep

echo ""
echo "🛑 PM2 프로세스 완전 종료..."
pm2 kill > /dev/null 2>&1
pm2 delete all > /dev/null 2>&1

echo ""
echo "🔍 포트 13001 사용 프로세스 상세 분석..."
echo "=== netstat 결과 ==="
sudo netstat -tulpn | grep :13001 || echo "netstat에서 포트 13001 사용 프로세스 없음"
echo "=== ss 결과 ==="
sudo ss -tulpn | grep :13001 || echo "ss에서 포트 13001 사용 프로세스 없음"
echo "=== lsof 결과 ==="
sudo lsof -i :13001 || echo "lsof에서 포트 13001 사용 프로세스 없음"

echo ""
echo "🔍 next-server 프로세스 특별 처리..."
# next-server 프로세스 찾기 (다양한 패턴으로)
NEXT_SERVER_PIDS=$(ps aux | grep -E '(next-server|next start)' | grep -v grep | awk '{print $2}')
if [ ! -z "$NEXT_SERVER_PIDS" ]; then
    echo "next-server 프로세스 발견: $NEXT_SERVER_PIDS"
    echo $NEXT_SERVER_PIDS | xargs sudo kill -9 > /dev/null 2>&1
    sleep 2
    echo "next-server 프로세스 강제 종료 완료"
else
    echo "next-server 프로세스 없음"
fi

echo ""
echo "🔍 포트 13001 사용 프로세스 강제 종료 (다단계)..."
for attempt in {1..10}; do
    echo "시도 $attempt/10:"
    
    # lsof로 포트 사용 프로세스 찾기
    PORT_PROCESSES=$(sudo lsof -t -i :13001 2>/dev/null)
    if [ ! -z "$PORT_PROCESSES" ]; then
        echo "  lsof에서 발견된 PID: $PORT_PROCESSES"
        echo $PORT_PROCESSES | xargs sudo kill -9 > /dev/null 2>&1
    fi
    
# netstat으로 포트 사용 프로세스 찾기
NETSTAT_PIDS=$(sudo netstat -tulpn | grep :13001 | awk '{print $7}' | cut -d'/' -f1 | grep -v '-' | sort -u)
if [ ! -z "$NETSTAT_PIDS" ]; then
        echo "  netstat에서 발견된 PID: $NETSTAT_PIDS"
    echo $NETSTAT_PIDS | xargs sudo kill -9 > /dev/null 2>&1
fi

# ss로 포트 사용 프로세스 찾기
SS_PIDS=$(sudo ss -tulpn | grep :13001 | grep -o 'pid=[0-9]*' | cut -d'=' -f2 | sort -u)
if [ ! -z "$SS_PIDS" ]; then
        echo "  ss에서 발견된 PID: $SS_PIDS"
    echo $SS_PIDS | xargs sudo kill -9 > /dev/null 2>&1
fi

    # fuser로 포트 강제 해제
    sudo fuser -k 13001/tcp > /dev/null 2>&1
    
    sleep 1
    
    # 포트 해제 확인
    if ! sudo lsof -i :13001 > /dev/null 2>&1; then
        echo "  ✅ 포트 13001이 해제되었습니다."
        break
    else
        echo "  ⚠️ 포트 13001이 여전히 사용 중입니다."
        if [ $attempt -eq 10 ]; then
            echo "  ❌ 10번 시도 후에도 포트 해제 실패"
            sudo lsof -i :13001
        fi
    fi
done

echo ""
echo "🔍 모든 Next.js 관련 프로세스 완전 정리..."
sudo pkill -f 'next' > /dev/null 2>&1
sudo pkill -f 'node.*next' > /dev/null 2>&1
sudo pkill -f 'next-server' > /dev/null 2>&1
sudo pkill -f 'node.*13001' > /dev/null 2>&1
sudo pkill -f 'node.*kstarpick' > /dev/null 2>&1

echo ""
echo "🔍 Node.js 프로세스 중 kstarpick 관련 완전 정리..."
NODE_PROCESSES=$(ps aux | grep -E '(node.*kstarpick|node.*13001|node.*next)' | grep -v grep | awk '{print $2}')
if [ ! -z "$NODE_PROCESSES" ]; then
    echo "Node.js 프로세스 발견: $NODE_PROCESSES"
    echo $NODE_PROCESSES | xargs sudo kill -9 > /dev/null 2>&1
    sleep 2
fi

echo ""
echo "🔍 TCP 소켓 완전 정리..."
sudo ss -tulpn | grep :13001 | awk '{print $7}' | cut -d',' -f2 | cut -d'=' -f2 | xargs -r sudo kill -9 > /dev/null 2>&1

echo ""
echo "🧹 임시 파일 및 소켓 정리..."
sudo rm -f /tmp/.pm2-* > /dev/null 2>&1
sudo rm -f /tmp/pm2-* > /dev/null 2>&1
sudo rm -f /var/run/pm2-* > /dev/null 2>&1
sudo rm -f /tmp/.next-* > /dev/null 2>&1
sudo rm -f /tmp/next-* > /dev/null 2>&1

echo ""
echo "⏳ 포트 완전 해제 대기..."
sleep 5

echo ""
echo "🔍 최종 포트 13001 상태 확인..."
if sudo lsof -i :13001 > /dev/null 2>&1; then
    echo "❌ 포트 13001이 여전히 사용 중입니다."
    echo "=== 상세 정보 ==="
    sudo lsof -i :13001
    echo "=== 프로세스 트리 ==="
    sudo netstat -tulpn | grep :13001
    echo "=== 시스템 재부팅 권장 ==="
else
    echo "✅ 포트 13001이 완전히 해제되었습니다."
fi

echo ""
echo "✅ 모든 프로세스 정리 완료"
EOF
}

# 안전한 서버 시작 함수 (next-server 좀비 프로세스 대응 강화)
safe_start_server() {
    log_info "안전한 서버 시작 중..."
    ssh -i $PEM_KEY $EC2_USER@$EC2_HOST << 'EOF'
cd /doohub/service/kstarpick

echo "🔍 시작 전 최종 포트 확인 (강화)..."
for attempt in {1..5}; do
    echo "포트 확인 시도 $attempt/5:"
    
    # 다양한 방법으로 포트 사용 확인
    LSOF_CHECK=$(sudo lsof -i :13001 2>/dev/null)
    NETSTAT_CHECK=$(sudo netstat -tulpn | grep :13001 2>/dev/null)
    SS_CHECK=$(sudo ss -tulpn | grep :13001 2>/dev/null)
    
    if [ ! -z "$LSOF_CHECK" ] || [ ! -z "$NETSTAT_CHECK" ] || [ ! -z "$SS_CHECK" ]; then
        echo "  ⚠️ 포트 13001이 여전히 사용 중입니다. 추가 정리 중..."
        
        # lsof로 발견된 프로세스 정리
        if [ ! -z "$LSOF_CHECK" ]; then
            echo "  lsof 결과: $LSOF_CHECK"
        sudo lsof -t -i :13001 | xargs sudo kill -9 > /dev/null 2>&1
        fi
        
        # netstat으로 발견된 프로세스 정리
        if [ ! -z "$NETSTAT_CHECK" ]; then
            echo "  netstat 결과: $NETSTAT_CHECK"
            NETSTAT_PIDS=$(echo "$NETSTAT_CHECK" | awk '{print $7}' | cut -d'/' -f1 | grep -v '-' | sort -u)
            if [ ! -z "$NETSTAT_PIDS" ]; then
                echo $NETSTAT_PIDS | xargs sudo kill -9 > /dev/null 2>&1
            fi
        fi
        
        # ss로 발견된 프로세스 정리
        if [ ! -z "$SS_CHECK" ]; then
            echo "  ss 결과: $SS_CHECK"
            SS_PIDS=$(echo "$SS_CHECK" | grep -o 'pid=[0-9]*' | cut -d'=' -f2 | sort -u)
            if [ ! -z "$SS_PIDS" ]; then
                echo $SS_PIDS | xargs sudo kill -9 > /dev/null 2>&1
            fi
        fi
        
        # fuser로 포트 강제 해제
        sudo fuser -k 13001/tcp > /dev/null 2>&1
        
        # next-server 프로세스 다시 확인
        NEXT_PIDS=$(ps aux | grep -E '(next-server|next start)' | grep -v grep | awk '{print $2}')
        if [ ! -z "$NEXT_PIDS" ]; then
            echo "  next-server 프로세스 추가 발견: $NEXT_PIDS"
            echo $NEXT_PIDS | xargs sudo kill -9 > /dev/null 2>&1
        fi
        
        sleep 3
    else
        echo "  ✅ 포트 13001이 완전히 해제되었습니다."
        break
    fi
    
    if [ $attempt -eq 5 ]; then
        echo "  ❌ 5번 시도 후에도 포트 해제 실패. 강제 진행합니다."
        echo "  현재 포트 상태:"
        sudo lsof -i :13001 2>/dev/null || echo "  lsof: 포트 사용 없음"
        sudo netstat -tulpn | grep :13001 2>/dev/null || echo "  netstat: 포트 사용 없음"
        sudo ss -tulpn | grep :13001 2>/dev/null || echo "  ss: 포트 사용 없음"
    fi
done

echo ""
echo "🚀 PM2로 서버 시작..."
pm2 start ecosystem.config.js

echo ""
echo "⏳ 서버 시작 대기 (15초)..."
sleep 15

echo ""
echo "🔍 PM2 상태 확인..."
pm2 status

echo ""
echo "🔍 포트 13001 리스닝 확인..."
if sudo lsof -i :13001 > /dev/null 2>&1; then
    echo "✅ 포트 13001에서 서버가 정상적으로 실행 중입니다."
    sudo lsof -i :13001
    echo ""
    echo "🔍 서버 응답 테스트..."
    curl -s --max-time 5 "http://localhost:13001/api" > /dev/null && echo "✅ API 서버 응답 정상" || echo "⚠️ API 서버 응답 확인 필요"
else
    echo "❌ 포트 13001에서 서버가 실행되지 않았습니다."
    echo ""
    echo "🔍 PM2 로그 확인:"
    pm2 logs kstarpick --lines 15
    echo ""
    echo "🔍 현재 포트 상태:"
    sudo lsof -i :13001 2>/dev/null || echo "포트 13001 사용 없음"
    echo ""
    echo "🔄 서버 재시작 시도..."
    pm2 restart kstarpick
    sleep 10
    
    if sudo lsof -i :13001 > /dev/null 2>&1; then
        echo "✅ 재시작 성공: 서버가 정상적으로 실행 중입니다."
    else
        echo "❌ 재시작 실패: 수동 확인이 필요합니다."
    fi
fi
EOF
}

# 파일 업로드 함수
upload_files() {
    local files=("$@")
    
    if [ ${#files[@]} -eq 0 ]; then
        log_info "전체 프로젝트 업로드 중..."
        rsync -avz --progress \
            --exclude 'node_modules' \
            --exclude '.next' \
            --exclude '.git' \
            --exclude 'logs' \
            --exclude 'debug' \
            --exclude 'temp_logs.txt' \
            --exclude '*.log' \
            --exclude '.DS_Store' \
            --exclude 'npm-debug.log*' \
            --exclude 'yarn-debug.log*' \
            --exclude 'yarn-error.log*' \
            -e "ssh -i $PEM_KEY" \
            ./ $EC2_USER@$EC2_HOST:$EC2_PATH/
    else
        log_info "특정 파일/폴더 업로드 중..."
        for file in "${files[@]}"; do
            if [ -e "$file" ]; then
                log_info "업로드 중: $file"
                
                # 파일인지 디렉토리인지 확인
                if [ -d "$file" ]; then
                    # 디렉토리인 경우
                    rsync -avz --progress \
                        --exclude 'node_modules' \
                        --exclude '.next' \
                        --exclude '.git' \
                        -e "ssh -i $PEM_KEY" \
                        "$file/" $EC2_USER@$EC2_HOST:$EC2_PATH/"$file"/
                else
                    # 파일인 경우
                    # 디렉토리 구조 생성
                    dir=$(dirname "$file")
                    if [ "$dir" != "." ]; then
                        ssh -i $PEM_KEY $EC2_USER@$EC2_HOST "mkdir -p $EC2_PATH/$dir"
                    fi
                    
                    rsync -avz --progress \
                        -e "ssh -i $PEM_KEY" \
                        "$file" $EC2_USER@$EC2_HOST:$EC2_PATH/"$file"
                fi
                log_success "업로드 완료: $file"
            else
                log_warning "파일/폴더를 찾을 수 없습니다: $file"
            fi
        done
    fi
}

# PM2 재시작 함수 (포트 충돌 해결 포함)
restart_pm2() {
    log_info "PM2 안전 재시작 중..."
    ssh -i $PEM_KEY $EC2_USER@$EC2_HOST << 'EOF'
cd /doohub/service/kstarpick

# PM2 상태 확인
if ! command -v pm2 &> /dev/null; then
    echo "PM2가 설치되어 있지 않습니다."
    exit 1
fi

echo "🔍 현재 PM2 상태 확인..."
pm2 status

echo ""
echo "🛑 kstarpick 프로세스 중지..."
pm2 stop kstarpick > /dev/null 2>&1

echo ""
echo "🔍 포트 13001 충돌 확인 및 해결..."
PORT_PROCESSES=$(sudo lsof -t -i :13001 2>/dev/null)
if [ ! -z "$PORT_PROCESSES" ]; then
    echo "포트 충돌 발견. 강제 종료 중..."
    echo $PORT_PROCESSES | xargs sudo kill -9 > /dev/null 2>&1
    sudo fuser -k 13001/tcp > /dev/null 2>&1
    sleep 3
fi

echo ""
echo "🔄 kstarpick 프로세스 재시작..."
pm2 start kstarpick

echo ""
echo "⏳ 재시작 대기 (15초)..."
sleep 15

echo ""
echo "🔍 재시작 후 상태 확인..."
pm2 status kstarpick

echo ""
echo "🔍 포트 13001 확인..."
if sudo lsof -i :13001 > /dev/null 2>&1; then
    echo "✅ 서버가 정상적으로 실행 중입니다."
    sudo lsof -i :13001
else
    echo "❌ 서버 실행 실패. 로그 확인:"
    pm2 logs kstarpick --lines 15
    echo ""
    echo "🔄 추가 포트 정리 후 재시도..."
    sudo pkill -f 'next start' > /dev/null 2>&1
    sudo pkill -f 'next-server' > /dev/null 2>&1
    sleep 5
    pm2 restart kstarpick
    sleep 10
    
    if sudo lsof -i :13001 > /dev/null 2>&1; then
        echo "✅ 재시도 성공: 서버가 정상적으로 실행 중입니다."
    else
        echo "❌ 재시도 실패: 수동 확인이 필요합니다."
    fi
fi
EOF
}

# 빌드 후 재시작 함수 (개선된 버전)
build_and_restart() {
    log_info "빌드 후 안전 재시작 중..."
    ssh -i $PEM_KEY $EC2_USER@$EC2_HOST << 'EOF'
cd /doohub/service/kstarpick

echo "🛑 서버 중지..."
pm2 stop kstarpick > /dev/null 2>&1

echo ""
echo "🧹 모든 캐시 완전 삭제..."
echo "  - .next 폴더 삭제"
rm -rf .next
echo "  - node_modules/.cache 삭제"
rm -rf node_modules/.cache
echo "  - .swc 폴더 삭제"
rm -rf .swc
echo "  - Next.js 캐시 삭제"
rm -rf .next/cache
echo "  - 임시 파일 삭제"
rm -rf /tmp/.next-*
rm -rf /tmp/next-*

echo ""
echo "🔨 프로덕션 빌드 시작..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 빌드 성공"
else
    echo "❌ 빌드 실패"
    exit 1
fi

echo ""
echo "🚀 서버 재시작..."
pm2 start kstarpick

echo ""
echo "⏳ 재시작 대기 (15초)..."
sleep 15

echo ""
echo "🔍 재시작 후 상태 확인..."
pm2 status kstarpick

echo ""
echo "🔍 포트 13001 확인..."
if sudo lsof -i :13001 > /dev/null 2>&1; then
    echo "✅ 서버가 정상적으로 실행 중입니다."
else
    echo "❌ 서버 실행 실패. 로그 확인:"
    pm2 logs kstarpick --lines 20
fi
EOF
}

# 캐시 완전 삭제 후 재시작 함수
clear_cache_and_restart() {
    log_info "캐시 완전 삭제 후 재시작 중..."
    ssh -i $PEM_KEY $EC2_USER@$EC2_HOST << 'EOF'
cd /doohub/service/kstarpick

echo "🛑 모든 PM2 프로세스 중지..."
pm2 stop all > /dev/null 2>&1

echo ""
echo "🧹 모든 캐시 및 임시 파일 완전 삭제..."
echo "  - .next 폴더 삭제"
rm -rf .next
echo "  - node_modules/.cache 삭제"
rm -rf node_modules/.cache
echo "  - .swc 폴더 삭제"
rm -rf .swc
echo "  - Next.js 캐시 삭제"
rm -rf .next/cache
echo "  - 임시 파일 삭제"
rm -rf /tmp/.next-*
rm -rf /tmp/next-*
echo "  - PM2 임시 파일 삭제"
rm -rf /tmp/.pm2-*
rm -rf /tmp/pm2-*
echo "  - 로그 파일 정리"
rm -rf logs/*.log

echo ""
echo "🔄 포트 13001 완전 정리..."
sudo fuser -k 13001/tcp > /dev/null 2>&1
sudo fuser -k 3000/tcp > /dev/null 2>&1
sleep 3

echo ""
echo "🔨 프로덕션 빌드 시작..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 빌드 성공"
else
    echo "❌ 빌드 실패"
    exit 1
fi

echo ""
echo "🚀 서버 재시작..."
pm2 start ecosystem.config.js

echo ""
echo "⏳ 재시작 대기 (20초)..."
sleep 20

echo ""
echo "🔍 재시작 후 상태 확인..."
pm2 status

echo ""
echo "🔍 포트 13001 확인..."
if sudo lsof -i :13001 > /dev/null 2>&1; then
    echo "✅ 서버가 정상적으로 실행 중입니다."
    sudo lsof -i :13001
else
    echo "❌ 서버 실행 실패. 로그 확인:"
    pm2 logs kstarpick --lines 20
fi
EOF
}

# 서버 상태 확인 (개선된 버전)
check_server_status() {
    log_info "서버 상태 확인 중..."
    
    # 포트 확인
    log_info "포트 13001 확인..."
    if ssh -i $PEM_KEY $EC2_USER@$EC2_HOST "sudo lsof -i :13001" > /dev/null 2>&1; then
        log_success "포트 13001 정상 리스닝"
    else
        log_error "포트 13001 리스닝 실패"
    fi
    
    # API 테스트
    log_info "API 서버 테스트..."
    sleep 5
    if curl -s --max-time 10 "http://$EC2_HOST:13001/api/news?limit=1" | jq '.success' > /dev/null 2>&1; then
        log_success "API 서버 정상 작동"
    else
        log_warning "API 서버 응답 확인 필요"
    fi
    
    # 홈페이지 테스트
    log_info "홈페이지 테스트..."
    if curl -s --max-time 10 "http://$EC2_HOST:13001/" | grep -q "kstarpick"; then
        log_success "홈페이지 정상 작동"
    else
        log_warning "홈페이지 응답 확인 필요"
    fi
}

# 메인 실행 부분
main() {
    local mode="all"
    local files=()
    local build_flag=false
    local kill_all_flag=false
    local clear_cache_flag=false
    
    # 파라미터 파싱
    while [[ $# -gt 0 ]]; do
        case $1 in
            -a|--all)
                mode="all"
                shift
                ;;
            -f|--files)
                mode="files"
                shift
                ;;
            -r|--restart)
                mode="restart"
                shift
                ;;
            -b|--build)
                build_flag=true
                shift
                ;;
            -k|--kill-all)
                kill_all_flag=true
                shift
                ;;
            -c|--clear-cache)
                clear_cache_flag=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                if [[ $mode == "files" ]]; then
                    files+=("$1")
                fi
                shift
                ;;
        esac
    done
    
    echo -e "${BLUE}🚀 KstarPick 서버 배포 시작...${NC}"
    echo "======================================="
    
    # 서버 연결 테스트
    if ! test_connection; then
        exit 1
    fi
    
    # 모든 프로세스 강제 종료 (kill-all 플래그가 있거나 빌드 플래그가 있을 때)
    if [ "$kill_all_flag" = true ] || [ "$build_flag" = true ] || [ "$clear_cache_flag" = true ]; then
        kill_all_processes
    fi
    
    # 포트 충돌 사전 확인
    log_info "포트 13001 사전 확인..."
    if ssh -i $PEM_KEY $EC2_USER@$EC2_HOST "sudo lsof -i :13001" > /dev/null 2>&1; then
        log_warning "포트 13001이 이미 사용 중입니다. 자동 해결 중..."
        kill_all_processes
    fi
    
    # 모드별 실행
    case $mode in
        "all")
            upload_files
            if [ "$clear_cache_flag" = true ]; then
                clear_cache_and_restart
            elif [ "$build_flag" = true ]; then
                build_and_restart
            elif [ "$kill_all_flag" = true ]; then
                safe_start_server
            else
                restart_pm2
            fi
            ;;
        "files")
            if [ ${#files[@]} -eq 0 ]; then
                log_error "업로드할 파일을 지정해주세요."
                usage
            fi
            upload_files "${files[@]}"
            if [ "$clear_cache_flag" = true ]; then
                clear_cache_and_restart
            elif [ "$build_flag" = true ]; then
                build_and_restart
            elif [ "$kill_all_flag" = true ]; then
                safe_start_server
            else
                restart_pm2
            fi
            ;;
        "restart")
            if [ "$clear_cache_flag" = true ]; then
                clear_cache_and_restart
            elif [ "$build_flag" = true ]; then
                build_and_restart
            elif [ "$kill_all_flag" = true ]; then
                safe_start_server
            else
                restart_pm2
            fi
            ;;
    esac
    
    # 서버 상태 확인
    check_server_status
    
    echo "======================================="
    log_success "배포 완료!"
    echo -e "${BLUE}🌐 사이트 URL: http://$EC2_HOST:13001${NC}"
    echo -e "${YELLOW}💡 포트 충돌 발생 시: $0 -k 또는 $0 -c 사용${NC}"
    echo -e "${YELLOW}💡 캐시 문제 발생 시: $0 -c (권장) 또는 $0 -k -b 사용${NC}"
    echo -e "${YELLOW}💡 next-server 좀비 프로세스 문제 시: $0 -k -c (강력 정리)${NC}"
}

# 스크립트 실행
main "$@" 