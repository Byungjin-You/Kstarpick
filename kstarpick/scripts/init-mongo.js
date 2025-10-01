db = db.getSiblingDB('kpop-news-portal');
db.createUser({
  user: 'kstarpick',
  pwd: 'Kstar!@pick2024',
  roles: [ { role: 'readWrite', db: 'kpop-news-portal' } ]
}); 