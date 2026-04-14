import { connectToDatabase } from '../../utils/mongodb';
import { ObjectId } from 'mongodb';

// photo/[id] 접근 시 news/[slug]로 리다이렉트
export default function PhotoRedirect() { return null; }

export async function getServerSideProps({ params }) {
  try {
    const { db } = await connectToDatabase();
    const { id } = params;
    if (!ObjectId.isValid(id)) return { notFound: true };

    const photo = await db.collection('news').findOne(
      { _id: new ObjectId(id) },
      { projection: { slug: 1 } }
    );
    if (!photo) return { notFound: true };

    return {
      redirect: {
        destination: `/news/${photo.slug || photo._id}`,
        permanent: false,
      },
    };
  } catch {
    return { notFound: true };
  }
}
