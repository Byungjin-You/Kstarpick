(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[5268,6834],{97291:function(e,t,a){(window.__NEXT_P=window.__NEXT_P||[]).push(["/admin/news/create",function(){return a(17522)}])},2575:function(e,t,a){"use strict";a.r(t);var r=a(85893),s=a(67294),l=a(41664),n=a.n(l),i=a(11163),o=a(33299),d=a(43765),c=a(38361),u=a(2553),m=a(63594),f=a(2287),x=a(89176),p=a(55264),h=a(70095),g=a(77362),b=a(94086),y=a(70088),v=a(70775);t.default=e=>{let{children:t}=e,a=(0,i.useRouter)(),{data:l,status:j}=(0,o.useSession)(),[N,w]=(0,s.useState)(!1);return((0,s.useEffect)(()=>{("unauthenticated"===j||l&&"admin"!==l.user.role)&&a.push("/admin/login")},[l,j,a]),"loading"===j)?(0,r.jsx)("div",{className:"flex items-center justify-center min-h-screen bg-gray-100",children:(0,r.jsx)("div",{className:"p-8 bg-white rounded-lg shadow-md",children:(0,r.jsxs)("div",{className:"flex items-center space-x-4",children:[(0,r.jsx)("div",{className:"w-12 h-12 border-4 border-t-[#ff3e8e] rounded-full animate-spin"}),(0,r.jsx)("p",{className:"text-xl font-medium",children:"Loading admin panel..."})]})})}):"unauthenticated"===j||l&&"admin"!==l.user.role?(0,r.jsx)("div",{className:"flex items-center justify-center min-h-screen bg-gray-100",children:(0,r.jsx)("div",{className:"p-8 bg-white rounded-lg shadow-md max-w-md",children:(0,r.jsxs)("div",{className:"flex flex-col items-center space-y-4 text-center",children:[(0,r.jsx)(d.default,{size:48,className:"text-red-500"}),(0,r.jsx)("h1",{className:"text-2xl font-bold text-gray-800",children:"Unauthorized Access"}),(0,r.jsx)("p",{className:"text-gray-600",children:"You don't have permission to access the admin area."}),(0,r.jsx)(n(),{href:"/",className:"px-4 py-2 mt-4 text-white bg-[#ff3e8e] rounded-md hover:bg-[#e02e7c]",children:"Go to Homepage"})]})})}):(c.default,u.default,m.default,f.default,x.default,p.default,(0,r.jsx)("div",{className:"min-h-screen bg-gray-100",children:(0,r.jsxs)("div",{className:"flex",children:[(0,r.jsxs)("div",{className:"w-64 min-h-screen bg-white shadow-md",children:[(0,r.jsx)("div",{className:"p-4 border-b",children:(0,r.jsx)("h2",{className:"text-xl font-semibold text-gray-800",children:"관리자 패널"})}),(0,r.jsxs)("div",{className:"p-4",children:[(0,r.jsxs)("ul",{className:"space-y-2",children:[(0,r.jsx)("li",{children:(0,r.jsxs)(n(),{href:"/admin",className:"flex items-center px-4 py-2 rounded-lg ".concat("/admin"===a.pathname?"bg-blue-600 text-white":"text-gray-800 hover:bg-blue-100"),children:[(0,r.jsx)(c.default,{className:"mr-3 h-5 w-5"}),"대시보드"]})}),(0,r.jsx)("li",{children:(0,r.jsxs)(n(),{href:"/admin/content",className:"flex items-center px-4 py-2 rounded-lg ".concat(a.pathname.startsWith("/admin/content")?"bg-blue-600 text-white":"text-gray-800 hover:bg-blue-100"),children:[(0,r.jsx)(h.default,{className:"mr-3 h-5 w-5"}),"콘텐츠 관리"]})}),(0,r.jsx)("li",{children:(0,r.jsxs)(n(),{href:"/admin/news",className:"flex items-center px-4 py-2 rounded-lg ".concat(a.pathname.startsWith("/admin/news")?"bg-blue-600 text-white":"text-gray-800 hover:bg-blue-100"),children:[(0,r.jsx)(g.default,{className:"mr-3 h-5 w-5"}),"뉴스 관리"]})}),(0,r.jsx)("li",{children:(0,r.jsxs)(n(),{href:"/admin/drama",className:"flex items-center px-4 py-2 rounded-lg ".concat(a.pathname.startsWith("/admin/drama")?"bg-blue-600 text-white":"text-gray-800 hover:bg-blue-100"),children:[(0,r.jsx)(b.default,{className:"mr-3 h-5 w-5"}),"드라마 관리"]})}),(0,r.jsx)("li",{children:(0,r.jsxs)(n(),{href:"/admin/music",className:"flex items-center px-4 py-2 rounded-lg ".concat(a.pathname.startsWith("/admin/music")?"bg-blue-600 text-white":"text-gray-800 hover:bg-blue-100"),children:[(0,r.jsx)(f.default,{className:"mr-3 h-5 w-5"}),"음악 차트 관리"]})}),(0,r.jsx)("li",{children:(0,r.jsxs)(n(),{href:"/admin/celeb",className:"flex items-center px-4 py-2 rounded-lg ".concat(a.pathname.startsWith("/admin/celeb")?"bg-blue-600 text-white":"text-gray-800 hover:bg-blue-100"),children:[(0,r.jsx)(y.default,{className:"mr-3 h-5 w-5"}),"셀럽 관리"]})}),(0,r.jsx)("li",{children:(0,r.jsxs)(n(),{href:"/admin/users",className:"flex items-center px-4 py-2 rounded-lg ".concat(a.pathname.startsWith("/admin/users")?"bg-blue-600 text-white":"text-gray-800 hover:bg-blue-100"),children:[(0,r.jsx)(x.default,{className:"mr-3 h-5 w-5"}),"사용자 관리"]})})]}),(0,r.jsx)("div",{className:"border-t mt-4 pt-4",children:(0,r.jsxs)("button",{onClick:()=>{localStorage.removeItem("adminToken"),sessionStorage.removeItem("adminToken"),(0,o.signOut)({callbackUrl:"/"})},className:"flex items-center w-full px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors",children:[(0,r.jsx)(v.default,{className:"mr-3 h-5 w-5"}),"로그아웃"]})})]})]}),(0,r.jsx)("div",{className:"flex-1",children:t})]})}))}},63759:function(e,t,a){"use strict";a.r(t),a.d(t,{default:function(){return n},toKebabCase:function(){return l}});var r=a(67294),s={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};let l=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),n=(e,t)=>{let a=(0,r.forwardRef)((a,n)=>{let{color:i="currentColor",size:o=24,strokeWidth:d=2,absoluteStrokeWidth:c,children:u,...m}=a;return(0,r.createElement)("svg",{ref:n,...s,width:o,height:o,stroke:i,strokeWidth:c?24*Number(d)/Number(o):d,className:"lucide lucide-".concat(l(e)),...m},[...t.map(e=>{let[t,a]=e;return(0,r.createElement)(t,a)}),...(Array.isArray(u)?u:[u])||[]])});return a.displayName="".concat(e),a}},92761:function(e,t,a){"use strict";a.r(t),a.d(t,{default:function(){return r}});let r=(0,a(63759).default)("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]])},60493:function(e,t,a){"use strict";a.r(t),a.d(t,{default:function(){return r}});let r=(0,a(63759).default)("CheckCircle",[["path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14",key:"g774vq"}],["polyline",{points:"22 4 12 14.01 9 11.01",key:"6xbx8j"}]])},15928:function(e,t,a){"use strict";a.r(t),a.d(t,{default:function(){return r}});let r=(0,a(63759).default)("Eye",[["path",{d:"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z",key:"rwhkz3"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]])},42020:function(e,t,a){"use strict";a.r(t),a.d(t,{default:function(){return r}});let r=(0,a(63759).default)("Globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"2",x2:"22",y1:"12",y2:"12",key:"1dnqot"}],["path",{d:"M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",key:"nb9nel"}]])},68760:function(e,t,a){"use strict";a.r(t),a.d(t,{default:function(){return r}});let r=(0,a(63759).default)("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]])},92385:function(e,t,a){"use strict";a.r(t),a.d(t,{default:function(){return r}});let r=(0,a(63759).default)("Link",[["path",{d:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",key:"1cjeqo"}],["path",{d:"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",key:"19qd67"}]])},69819:function(e,t,a){"use strict";a.r(t),a.d(t,{default:function(){return r}});let r=(0,a(63759).default)("Save",[["path",{d:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z",key:"1owoqh"}],["polyline",{points:"17 21 17 13 7 13 7 21",key:"1md35c"}],["polyline",{points:"7 3 7 8 15 8",key:"8nz8an"}]])},17522:function(e,t,a){"use strict";a.r(t),a.d(t,{default:function(){return D}});var r=a(85893),s=a(67294),l=a(33299),n=a(11163);a(41664);var i=a(9008),o=a.n(i),d=a(92761),c=a(15928),u=a(69819),m=a(43765),f=a(60493),x=a(68760),p=a(42020),h=a(43283),g=a(92385),b=a(62190),y=a(2575),v=a(5152),j=a.n(v);a(86834);var N=a(86501);let w=j()(()=>Promise.all([a.e(2937),a.e(1876),a.e(1167)]).then(a.t.bind(a,71167,23)),{loadableGenerated:{webpack:()=>[71167]},ssr:!1,loading:()=>(0,r.jsx)("div",{className:"h-64 border rounded-md flex items-center justify-center bg-gray-50",children:(0,r.jsx)("p",{className:"text-gray-500",children:"에디터 로딩 중..."})})}),k=()=>((0,s.useEffect)(()=>{Promise.resolve().then(a.t.bind(a,86834,23))},[]),null),C={toolbar:[[{header:[1,2,3,4,5,6,!1]}],["bold","italic","underline","strike","blockquote"],[{list:"ordered"},{list:"bullet"}],["link","image"],["clean"]]},E=["header","bold","italic","underline","strike","list","bullet","indent","align","link","image"],S=[{value:"kpop",label:"K-POP"},{value:"kdrama",label:"K-Drama"},{value:"entertainment",label:"엔터테인먼트"},{value:"celebrity",label:"셀러브리티"},{value:"interview",label:"인터뷰"},{value:"culture",label:"문화"}],z=[{value:"drama",label:"Drama"},{value:"kpop",label:"K-POP"},{value:"celeb",label:"Celebrity"},{value:"movie",label:"Movie"},{value:"variety",label:"Variety Show"},{value:"other",label:"Other"}],P={title:"",summary:"",content:"",category:"drama",featured:!1,tags:[]};function D(){var e;let t=(0,n.useRouter)(),{data:a,status:i}=(0,l.useSession)({required:!1}),[v,j]=(0,s.useState)(!1),[D,I]=(0,s.useState)(P),[L,O]=(0,s.useState)(""),[T,A]=(0,s.useState)(!1),[$,_]=(0,s.useState)(null),[M,U]=(0,s.useState)(""),[F,R]=(0,s.useState)(!1),[W,q]=(0,s.useState)(""),[G,H]=(0,s.useState)(!1),[K,B]=(0,s.useState)(""),[J,V]=(0,s.useState)("");(0,s.useEffect)(()=>{"unauthenticated"===i&&t.push("/auth/signin?callbackUrl=/admin/news/create")},[i,t]);let Z=e=>{let{name:t,value:a,type:r,checked:s}=e.target;I(e=>({...e,[t]:"checkbox"===r?s:a})),B("")},X=()=>{L.trim()&&!D.tags.includes(L.trim())&&(I({...D,tags:[...D.tags,L.trim()]}),O(""))},Y=e=>{I({...D,tags:D.tags.filter(t=>t!==e)})},Q=async e=>{if(!["image/jpeg","image/png","image/webp","image/gif"].includes(e.type)){B("지원되는 이미지 형식은 JPEG, PNG, WebP, GIF입니다.");return}if(e.size>5242880){B("이미지 크기는 5MB 이하여야 합니다.");return}_(e);try{U(URL.createObjectURL(e)),B(""),I(t=>({...t,coverImage:e})),N.toast.success("이미지가 성공적으로 선택되었습니다.")}catch(e){B("파일 처리 중 오류가 발생했습니다: "+e.message)}},ee=()=>{if(W.trim()){let e=W.trim().replace(/^@/,"");if(!e.match(/^(http|https):\/\//)){B("URL은 http:// 또는 https://로 시작해야 합니다.");return}I(t=>({...t,coverImage:e})),U(e),_(null),B(""),N.toast.success("이미지 URL이 설정되었습니다.")}else B("이미지 URL을 입력해주세요.")},et=async e=>{e.preventDefault(),B(""),j(!0);try{let e=["title","summary","content","category"].filter(e=>!D[e]);if(!D.coverImage&&!F&&!W){B("커버 이미지는 필수입니다. 파일을 업로드하거나 이미지 URL을 입력해주세요."),j(!1);return}if(e.length>0){B("필수 항목을 모두 입력해주세요: ".concat(e.join(", "))),j(!1);return}let a=new FormData;if(a.append("title",D.title),a.append("summary",D.summary),a.append("content",D.content),a.append("category",D.category),a.append("featured",D.featured),D.tags&&D.tags.length>0?a.append("tags",JSON.stringify(D.tags)):a.append("tags",JSON.stringify([])),F&&W){if(!W.startsWith("http://")&&!W.startsWith("https://")){B("이미지 URL은 http:// 또는 https://로 시작해야 합니다."),j(!1);return}let e=W.replace(/@/g,"");a.append("coverImageUrl",e)}else D.coverImage&&a.append("file",D.coverImage);let r=await fetch("/api/news",{method:"POST",body:a}),s=await r.json();if(!r.ok)throw Error(s.message||"뉴스 등록 중 오류가 발생했습니다.");N.toast.success("뉴스가 성공적으로 등록되었습니다."),I({title:"",summary:"",content:"",category:"",tags:[],featured:!1}),O(""),q(""),R(!1),_(null),U(null),setTimeout(()=>{t.push("/admin/news")},1e3)}catch(e){B(e.message)}finally{j(!1)}};return"loading"===i?(0,r.jsxs)(y.default,{children:[(0,r.jsx)(o(),{children:(0,r.jsx)("title",{children:"Create News Article | Admin"})}),(0,r.jsx)("div",{className:"flex items-center justify-center h-64",children:(0,r.jsx)("div",{className:"animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"})})]}):(0,r.jsxs)(y.default,{children:[(0,r.jsx)(o(),{children:(0,r.jsx)("title",{children:"Create News Article | Admin"})}),(0,r.jsx)(k,{}),(0,r.jsxs)("div",{className:"mb-6 flex flex-col md:flex-row md:items-center md:justify-between",children:[(0,r.jsxs)("div",{className:"flex items-center",children:[(0,r.jsx)("button",{onClick:()=>t.back(),className:"mr-4 p-2 text-gray-500 hover:text-gray-700 transition-colors",children:(0,r.jsx)(d.default,{size:20})}),(0,r.jsxs)("div",{children:[(0,r.jsx)("h1",{className:"text-2xl font-bold text-gray-800",children:"Create News Article"}),(0,r.jsx)("p",{className:"text-gray-500",children:"Create a new news article to publish on your site"})]})]}),(0,r.jsxs)("div",{className:"flex items-center mt-4 md:mt-0 space-x-3",children:[(0,r.jsxs)("button",{type:"button",onClick:()=>{A(!T)},className:"px-4 py-2 flex items-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors",children:[(0,r.jsx)(c.default,{size:18,className:"mr-2"}),T?"Edit Mode":"Preview"]}),(0,r.jsxs)("button",{type:"button",onClick:et,disabled:v,className:"px-4 py-2 flex items-center bg-[#ff3e8e] text-white rounded-lg hover:bg-[#e02e7c] transition-colors",children:[(0,r.jsx)(u.default,{size:18,className:"mr-2"}),v?"Publishing...":"Publish"]})]})]}),K&&(0,r.jsxs)("div",{className:"mb-6 flex items-center p-4 bg-red-50 border-l-4 border-red-500 rounded-md",children:[(0,r.jsx)(m.default,{size:24,className:"text-red-500 mr-3"}),(0,r.jsx)("p",{className:"text-red-700",children:K})]}),J&&(0,r.jsxs)("div",{className:"mb-6 flex items-center p-4 bg-green-50 border-l-4 border-green-500 rounded-md",children:[(0,r.jsx)(f.default,{size:24,className:"text-green-500 mr-3"}),(0,r.jsx)("p",{className:"text-green-700",children:J})]}),(0,r.jsx)("div",{className:"bg-white rounded-lg shadow-sm overflow-hidden",children:T?(0,r.jsx)("div",{className:"p-6",children:(0,r.jsxs)("div",{className:"mb-8",children:[D.coverImage?(0,r.jsx)("div",{className:"relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden",children:(0,r.jsx)("img",{src:D.coverImage,alt:D.title,className:"w-full h-full object-cover"})}):(0,r.jsx)("div",{className:"w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center",children:(0,r.jsxs)("div",{className:"text-center text-gray-400",children:[(0,r.jsx)(x.default,{size:48,className:"mx-auto mb-2"}),(0,r.jsx)("p",{children:"No cover image"})]})}),(0,r.jsxs)("div",{className:"mt-6 mb-4",children:[D.category&&(0,r.jsx)("span",{className:"inline-block bg-blue-100 text-blue-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded",children:(null===(e=S.find(e=>e.value===D.category))||void 0===e?void 0:e.label)||D.category}),D.featured&&(0,r.jsx)("span",{className:"inline-block bg-green-100 text-green-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded",children:"Featured"})]}),(0,r.jsx)("h1",{className:"text-4xl font-bold text-gray-900 mb-4",children:D.title||"Untitled Article"}),(0,r.jsx)("p",{className:"text-xl text-gray-600 mb-8",children:D.summary||"No summary provided"}),(0,r.jsxs)("div",{className:"flex items-center text-sm text-gray-500 mb-8",children:[(0,r.jsx)(p.default,{size:16,className:"mr-2"}),(0,r.jsxs)("span",{children:["Published: ",new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})]})]}),(0,r.jsx)("div",{className:"prose prose-lg max-w-none",children:D.content?(0,r.jsx)("div",{dangerouslySetInnerHTML:{__html:D.content.replace(/\n/g,"<br>")}}):(0,r.jsx)("p",{className:"text-gray-400",children:"No content provided"})}),D.tags.length>0&&(0,r.jsxs)("div",{className:"mt-8 pt-6 border-t border-gray-100",children:[(0,r.jsx)("h3",{className:"text-sm font-medium text-gray-500 mb-3",children:"Tags"}),(0,r.jsx)("div",{className:"flex flex-wrap gap-2",children:D.tags.map(e=>(0,r.jsxs)("span",{className:"inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full",children:["#",e]},e))})]})]})}):(0,r.jsx)("form",{onSubmit:et,className:"p-6",children:(0,r.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-6",children:[(0,r.jsxs)("div",{className:"md:col-span-2 space-y-6",children:[(0,r.jsxs)("div",{children:[(0,r.jsxs)("label",{htmlFor:"title",className:"block text-sm font-medium text-gray-700 mb-1",children:["Title ",(0,r.jsx)("span",{className:"text-red-500",children:"*"})]}),(0,r.jsx)("input",{type:"text",id:"title",name:"title",value:D.title,onChange:Z,className:"block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e] outline-none transition-colors",placeholder:"Enter article title",required:!0})]}),(0,r.jsxs)("div",{children:[(0,r.jsxs)("label",{htmlFor:"summary",className:"block text-sm font-medium text-gray-700 mb-1",children:["Summary ",(0,r.jsx)("span",{className:"text-red-500",children:"*"})]}),(0,r.jsx)("textarea",{id:"summary",name:"summary",value:D.summary,onChange:Z,rows:"3",className:"block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e] outline-none transition-colors",placeholder:"Enter a brief summary of the article",required:!0})]}),(0,r.jsxs)("div",{children:[(0,r.jsxs)("label",{htmlFor:"content",className:"block text-sm font-medium text-gray-700 mb-1",children:["Content ",(0,r.jsx)("span",{className:"text-red-500",children:"*"})]}),(0,r.jsx)("div",{className:"border border-gray-200 rounded-lg",style:{height:"400px"},children:(0,r.jsx)(w,{theme:"snow",value:D.content,onChange:e=>{I({...D,content:e}),B("")},modules:C,formats:E,placeholder:"Write your article content here...",style:{height:"358px"}})}),(0,r.jsx)("p",{className:"mt-1 text-xs text-gray-500",children:"Use the formatting toolbar to style your content, add links, and insert images."})]})]}),(0,r.jsxs)("div",{className:"space-y-6",children:[(0,r.jsxs)("div",{children:[(0,r.jsxs)("label",{className:"block text-sm font-medium text-gray-700 mb-1",children:["Cover Image ",(0,r.jsx)("span",{className:"text-red-500",children:"*"})]}),(0,r.jsx)("div",{className:"flex justify-between mb-3",children:(0,r.jsx)("button",{type:"button",onClick:()=>{let e=!F;R(e),e?(_(null),U(null)):q(""),B("")},className:"px-3 py-1.5 text-sm rounded-md ".concat(F?"bg-[#ff3e8e] text-white":"bg-gray-100 text-gray-700"),children:F?(0,r.jsx)(h.default,{size:16}):(0,r.jsx)(g.default,{size:16})})}),F?(0,r.jsxs)("div",{className:"space-y-2",children:[(0,r.jsxs)("div",{className:"flex",children:[(0,r.jsx)("input",{type:"text",value:W,onChange:e=>{q(e.target.value),B("")},onKeyPress:e=>{"Enter"===e.key&&(e.preventDefault(),ee())},placeholder:"Enter image URL",className:"flex-1 p-3 border rounded-l-md border-gray-300"}),(0,r.jsx)("button",{type:"button",onClick:ee,className:"px-4 py-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-r-md hover:bg-gray-200",children:"적용"})]}),(0,r.jsx)("p",{className:"text-xs text-gray-500",children:"외부 URL을 입력하세요 (예: https://example.com/image.jpg). '@' 문자가 앞에 있다면 자동으로 제거됩니다."})]}):(0,r.jsx)("div",{className:"border-2 border-dashed rounded-lg p-6 text-center ".concat(G?"border-[#ff3e8e] bg-[#ff3e8e]/5":"border-gray-300"),onDragOver:e=>{e.preventDefault(),H(!0)},onDragLeave:e=>{e.preventDefault(),H(!1)},onDrop:e=>{e.preventDefault(),H(!1),e.dataTransfer.files&&e.dataTransfer.files[0]&&Q(e.dataTransfer.files[0])},children:(0,r.jsx)("div",{className:"flex flex-col items-center justify-center space-y-3",children:M?(0,r.jsxs)("div",{className:"relative w-full max-w-xs",children:[(0,r.jsx)("img",{src:M,alt:"Preview",className:"w-full h-48 object-cover rounded-md"}),(0,r.jsx)("button",{type:"button",onClick:()=>{_(null),U(""),I({...D,coverImage:""})},className:"absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100",children:(0,r.jsx)(b.default,{size:16})})]}):(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("div",{className:"p-3 rounded-full bg-gray-100 text-gray-400",children:(0,r.jsx)(x.default,{size:24})}),(0,r.jsxs)("div",{className:"text-center",children:[(0,r.jsx)("p",{className:"text-gray-700 mb-1",children:"이미지를 여기에 끌어다 놓거나"}),(0,r.jsxs)("label",{className:"inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-md cursor-pointer hover:bg-gray-200",children:["컴퓨터에서 이미지 선택",(0,r.jsx)("input",{type:"file",onChange:e=>{e.target.files&&e.target.files[0]&&Q(e.target.files[0])},accept:"image/jpeg,image/png,image/webp,image/gif",className:"hidden"})]})]}),(0,r.jsx)("p",{className:"text-xs text-gray-500",children:"지원 형식: JPEG, PNG, WebP, GIF (최대 5MB)"})]})})})]}),(0,r.jsxs)("div",{children:[(0,r.jsx)("label",{htmlFor:"category",className:"block text-sm font-medium text-gray-700 mb-1",children:"Category"}),(0,r.jsx)("select",{id:"category",name:"category",value:D.category,onChange:Z,className:"block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e] outline-none transition-colors",children:z.map(e=>(0,r.jsx)("option",{value:e.value,children:e.label},e.value))})]}),(0,r.jsxs)("div",{children:[(0,r.jsx)("label",{htmlFor:"tags",className:"block text-sm font-medium text-gray-700 mb-1",children:"Tags"}),(0,r.jsxs)("div",{className:"flex mb-2",children:[(0,r.jsx)("input",{type:"text",id:"tagInput",value:L,onChange:e=>{O(e.target.value)},onKeyPress:e=>{"Enter"===e.key&&(e.preventDefault(),X())},className:"flex-1 p-3 border border-gray-200 rounded-l-lg focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e] outline-none transition-colors",placeholder:"Add a tag"}),(0,r.jsx)("button",{type:"button",onClick:X,className:"px-4 py-3 bg-gray-100 text-gray-700 rounded-r-lg hover:bg-gray-200 transition-colors",children:"Add"})]}),(0,r.jsx)("div",{className:"flex flex-wrap gap-2",children:D.tags.map(e=>(0,r.jsxs)("span",{className:"inline-flex items-center bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full",children:["#",e,(0,r.jsx)("button",{type:"button",onClick:t=>{t.preventDefault(),Y(e)},className:"ml-1 text-gray-500 hover:text-gray-700",children:"\xd7"})]},e))})]}),(0,r.jsxs)("div",{className:"flex items-center",children:[(0,r.jsx)("input",{type:"checkbox",id:"featured",name:"featured",checked:D.featured,onChange:Z,className:"w-4 h-4 text-[#ff3e8e] border-gray-300 rounded focus:ring-[#ff3e8e]"}),(0,r.jsx)("label",{htmlFor:"featured",className:"ml-2 block text-sm text-gray-700",children:"Featured Article"})]})]})]})})})]})}},86834:function(){},86501:function(e,t,a){"use strict";let r,s;a.r(t),a.d(t,{CheckmarkIcon:function(){return Z},ErrorIcon:function(){return H},LoaderIcon:function(){return B},ToastBar:function(){return ei},ToastIcon:function(){return et},Toaster:function(){return eu},default:function(){return em},resolveValue:function(){return k},toast:function(){return A},useToaster:function(){return R},useToasterStore:function(){return L}});var l,n=a(67294);let i={data:""},o=e=>"object"==typeof window?((e?e.querySelector("#_goober"):window._goober)||Object.assign((e||document.head).appendChild(document.createElement("style")),{innerHTML:" ",id:"_goober"})).firstChild:e||i,d=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,c=/\/\*[^]*?\*\/|  +/g,u=/\n+/g,m=(e,t)=>{let a="",r="",s="";for(let l in e){let n=e[l];"@"==l[0]?"i"==l[1]?a=l+" "+n+";":r+="f"==l[1]?m(n,l):l+"{"+m(n,"k"==l[1]?"":t)+"}":"object"==typeof n?r+=m(n,t?t.replace(/([^,])+/g,e=>l.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+" "+t:t)):l):null!=n&&(l=/^--/.test(l)?l:l.replace(/[A-Z]/g,"-$&").toLowerCase(),s+=m.p?m.p(l,n):l+":"+n+";")}return a+(t&&s?t+"{"+s+"}":s)+r},f={},x=e=>{if("object"==typeof e){let t="";for(let a in e)t+=a+x(e[a]);return t}return e},p=(e,t,a,r,s)=>{var l;let n=x(e),i=f[n]||(f[n]=(e=>{let t=0,a=11;for(;t<e.length;)a=101*a+e.charCodeAt(t++)>>>0;return"go"+a})(n));if(!f[i]){let t=n!==e?e:(e=>{let t,a,r=[{}];for(;t=d.exec(e.replace(c,""));)t[4]?r.shift():t[3]?(a=t[3].replace(u," ").trim(),r.unshift(r[0][a]=r[0][a]||{})):r[0][t[1]]=t[2].replace(u," ").trim();return r[0]})(e);f[i]=m(s?{["@keyframes "+i]:t}:t,a?"":"."+i)}let o=a&&f.g?f.g:null;return a&&(f.g=f[i]),l=f[i],o?t.data=t.data.replace(o,l):-1===t.data.indexOf(l)&&(t.data=r?l+t.data:t.data+l),i},h=(e,t,a)=>e.reduce((e,r,s)=>{let l=t[s];if(l&&l.call){let e=l(a),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;l=t?"."+t:e&&"object"==typeof e?e.props?"":m(e,""):!1===e?"":e}return e+r+(null==l?"":l)},"");function g(e){let t=this||{},a=e.call?e(t.p):e;return p(a.unshift?a.raw?h(a,[].slice.call(arguments,1),t.p):a.reduce((e,a)=>Object.assign(e,a&&a.call?a(t.p):a),{}):a,o(t.target),t.g,t.o,t.k)}g.bind({g:1});let b,y,v,j=g.bind({k:1});function N(e,t){let a=this||{};return function(){let r=arguments;function s(l,n){let i=Object.assign({},l),o=i.className||s.className;a.p=Object.assign({theme:y&&y()},i),a.o=/ *go\d+/.test(o),i.className=g.apply(a,r)+(o?" "+o:""),t&&(i.ref=n);let d=e;return e[0]&&(d=i.as||e,delete i.as),v&&d[0]&&v(i),b(d,i)}return t?t(s):s}}var w=e=>"function"==typeof e,k=(e,t)=>w(e)?e(t):e,C=(r=0,()=>(++r).toString()),E=()=>{if(void 0===s&&"u">typeof window){let e=matchMedia("(prefers-reduced-motion: reduce)");s=!e||e.matches}return s},S=(e,t)=>{switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,20)};case 1:return{...e,toasts:e.toasts.map(e=>e.id===t.toast.id?{...e,...t.toast}:e)};case 2:let{toast:a}=t;return S(e,{type:e.toasts.find(e=>e.id===a.id)?1:0,toast:a});case 3:let{toastId:r}=t;return{...e,toasts:e.toasts.map(e=>e.id===r||void 0===r?{...e,dismissed:!0,visible:!1}:e)};case 4:return void 0===t.toastId?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(e=>e.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let s=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(e=>({...e,pauseDuration:e.pauseDuration+s}))}}},z=[],P={toasts:[],pausedAt:void 0},D=e=>{P=S(P,e),z.forEach(e=>{e(P)})},I={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},L=(e={})=>{let[t,a]=(0,n.useState)(P),r=(0,n.useRef)(P);(0,n.useEffect)(()=>(r.current!==P&&a(P),z.push(a),()=>{let e=z.indexOf(a);e>-1&&z.splice(e,1)}),[]);let s=t.toasts.map(t=>{var a,r,s;return{...e,...e[t.type],...t,removeDelay:t.removeDelay||(null==(a=e[t.type])?void 0:a.removeDelay)||(null==e?void 0:e.removeDelay),duration:t.duration||(null==(r=e[t.type])?void 0:r.duration)||(null==e?void 0:e.duration)||I[t.type],style:{...e.style,...null==(s=e[t.type])?void 0:s.style,...t.style}}});return{...t,toasts:s}},O=(e,t="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:(null==a?void 0:a.id)||C()}),T=e=>(t,a)=>{let r=O(t,e,a);return D({type:2,toast:r}),r.id},A=(e,t)=>T("blank")(e,t);A.error=T("error"),A.success=T("success"),A.loading=T("loading"),A.custom=T("custom"),A.dismiss=e=>{D({type:3,toastId:e})},A.remove=e=>D({type:4,toastId:e}),A.promise=(e,t,a)=>{let r=A.loading(t.loading,{...a,...null==a?void 0:a.loading});return"function"==typeof e&&(e=e()),e.then(e=>{let s=t.success?k(t.success,e):void 0;return s?A.success(s,{id:r,...a,...null==a?void 0:a.success}):A.dismiss(r),e}).catch(e=>{let s=t.error?k(t.error,e):void 0;s?A.error(s,{id:r,...a,...null==a?void 0:a.error}):A.dismiss(r)}),e};var $=(e,t)=>{D({type:1,toast:{id:e,height:t}})},_=()=>{D({type:5,time:Date.now()})},M=new Map,U=1e3,F=(e,t=U)=>{if(M.has(e))return;let a=setTimeout(()=>{M.delete(e),D({type:4,toastId:e})},t);M.set(e,a)},R=e=>{let{toasts:t,pausedAt:a}=L(e);(0,n.useEffect)(()=>{if(a)return;let e=Date.now(),r=t.map(t=>{if(t.duration===1/0)return;let a=(t.duration||0)+t.pauseDuration-(e-t.createdAt);if(a<0){t.visible&&A.dismiss(t.id);return}return setTimeout(()=>A.dismiss(t.id),a)});return()=>{r.forEach(e=>e&&clearTimeout(e))}},[t,a]);let r=(0,n.useCallback)(()=>{a&&D({type:6,time:Date.now()})},[a]),s=(0,n.useCallback)((e,a)=>{let{reverseOrder:r=!1,gutter:s=8,defaultPosition:l}=a||{},n=t.filter(t=>(t.position||l)===(e.position||l)&&t.height),i=n.findIndex(t=>t.id===e.id),o=n.filter((e,t)=>t<i&&e.visible).length;return n.filter(e=>e.visible).slice(...r?[o+1]:[0,o]).reduce((e,t)=>e+(t.height||0)+s,0)},[t]);return(0,n.useEffect)(()=>{t.forEach(e=>{if(e.dismissed)F(e.id,e.removeDelay);else{let t=M.get(e.id);t&&(clearTimeout(t),M.delete(e.id))}})},[t]),{toasts:t,handlers:{updateHeight:$,startPause:_,endPause:r,calculateOffset:s}}},W=j`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,q=j`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,G=j`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,H=N("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${W} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${q} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${G} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,K=j`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,B=N("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${K} 1s linear infinite;
`,J=j`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,V=j`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,Z=N("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${J} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${V} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,X=N("div")`
  position: absolute;
`,Y=N("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,Q=j`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,ee=N("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Q} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,et=({toast:e})=>{let{icon:t,type:a,iconTheme:r}=e;return void 0!==t?"string"==typeof t?n.createElement(ee,null,t):t:"blank"===a?null:n.createElement(Y,null,n.createElement(B,{...r}),"loading"!==a&&n.createElement(X,null,"error"===a?n.createElement(H,{...r}):n.createElement(Z,{...r})))},ea=e=>`
0% {transform: translate3d(0,${-200*e}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,er=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${-150*e}%,-1px) scale(.6); opacity:0;}
`,es=N("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,el=N("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,en=(e,t)=>{let a=e.includes("top")?1:-1,[r,s]=E()?["0%{opacity:0;} 100%{opacity:1;}","0%{opacity:1;} 100%{opacity:0;}"]:[ea(a),er(a)];return{animation:t?`${j(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${j(s)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},ei=n.memo(({toast:e,position:t,style:a,children:r})=>{let s=e.height?en(e.position||t||"top-center",e.visible):{opacity:0},l=n.createElement(et,{toast:e}),i=n.createElement(el,{...e.ariaProps},k(e.message,e));return n.createElement(es,{className:e.className,style:{...s,...a,...e.style}},"function"==typeof r?r({icon:l,message:i}):n.createElement(n.Fragment,null,l,i))});l=n.createElement,m.p=void 0,b=l,y=void 0,v=void 0;var eo=({id:e,className:t,style:a,onHeightUpdate:r,children:s})=>{let l=n.useCallback(t=>{if(t){let a=()=>{r(e,t.getBoundingClientRect().height)};a(),new MutationObserver(a).observe(t,{subtree:!0,childList:!0,characterData:!0})}},[e,r]);return n.createElement("div",{ref:l,className:t,style:a},s)},ed=(e,t)=>{let a=e.includes("top"),r=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:E()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(a?1:-1)}px)`,...a?{top:0}:{bottom:0},...r}},ec=g`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,eu=({reverseOrder:e,position:t="top-center",toastOptions:a,gutter:r,children:s,containerStyle:l,containerClassName:i})=>{let{toasts:o,handlers:d}=R(a);return n.createElement("div",{id:"_rht_toaster",style:{position:"fixed",zIndex:9999,top:16,left:16,right:16,bottom:16,pointerEvents:"none",...l},className:i,onMouseEnter:d.startPause,onMouseLeave:d.endPause},o.map(a=>{let l=a.position||t,i=ed(l,d.calculateOffset(a,{reverseOrder:e,gutter:r,defaultPosition:t}));return n.createElement(eo,{id:a.id,key:a.id,onHeightUpdate:d.updateHeight,className:a.visible?ec:"",style:i},"custom"===a.type?k(a.message,a):s?s(a):n.createElement(ei,{toast:a,position:l}))}))},em=A}},function(e){e.O(0,[1664,8766,9414,2888,9774,179],function(){return e(e.s=97291)}),_N_E=e.O()}]);