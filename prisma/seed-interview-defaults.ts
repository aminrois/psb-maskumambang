import { PrismaClient, InterviewPackageStatus, AnswerNoteMode } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_QUESTIONS = [
  {
    category: 'Motivasi & Komitmen',
    categoryDesc: 'Penilaian motivasi calon santri mendaftar di pesantren dan komitmen belajar.',
    question: 'Motivasi masuk pesantren dan komitmen belajar',
    guidance: 'Gali alasan calon santri mendaftar: apakah atas kemauan sendiri atau dorongan orang tua, serta kesiapan dan komitmen mengikuti seluruh kegiatan belajar dan disiplin pondok.',
    sortOrder: 1,
  },
  {
    category: 'Ibadah Keseharian',
    categoryDesc: 'Penilaian ibadah harian santri termasuk baca Al-Qur\'an, sholat jamaah, dan sholat sunnah.',
    question: "Ibadah keseharian santri (baca qur'an, sholat jamaah, sholat sunnah)",
    guidance: 'Observasi kebiasaan ibadah harian: kelancaran dan frekuensi membaca Al-Qur\'an, kedisiplinan sholat wajib berjamaah di masjid/musholla, dan amalan ibadah sunnah.',
    sortOrder: 2,
  },
  {
    category: 'Kemandirian & Kesiapan',
    categoryDesc: 'Penilaian kesiapan mandiri hidup di asrama pesantren.',
    question: 'Kemandirian dan kesiapan tinggal di asrama',
    guidance: 'Tinjau kesiapan mental jauh dari orang tua/keluarga, kemandirian mencuci pakaian, merapikan kasur/lemari, serta riwayat kesehatan fisik dan mental.',
    sortOrder: 3,
  },
  {
    category: 'Pembiasaan & Pergaulan',
    categoryDesc: 'Penilaian pembiasaan sehari-hari, pergaulan, etika, dan penggunaan media/gadget.',
    question: 'Pembiasaan sehari-hari (merokok, pertemanan, hubungan lawan jenis)',
    guidance: 'Gali kebiasaan pergaulan, penggunaan gadget/smartphone, riwayat merokok/vape, serta batas pergaulan dengan lawan jenis.',
    sortOrder: 4,
  },
  {
    category: 'Kondisi Ekonomi',
    categoryDesc: 'Penilaian kesiapan pembiayaan pendidikan orang tua/wali santri.',
    question: 'Kondisi ekonomi orang tua/wali',
    guidance: 'Pekerjaan orang tua/wali, kesiapan dan komitmen pembiayaan uang masuk, infaq bulanan/SPP, serta pemenuhan uang saku santri secara berkelanjutan.',
    sortOrder: 5,
  },
  {
    category: 'Hubungan Keluarga',
    categoryDesc: 'Penilaian dinamika keluarga dan kedekatan anak dengan orang tua.',
    question: 'Hubungan dalam keluarga (status anak, kedekatan anak dengan orang tua)',
    guidance: 'Status anak (kandung/angkat/yatim), urutan kelahiran, keharmonisan keluarga, kedekatan emosional dan pola asuh orang tua terhadap anak.',
    sortOrder: 6,
  },
  {
    category: 'Sumber Informasi',
    categoryDesc: 'Penelusuran asal usul informasi Pondok Pesantren Maskumambang.',
    question: 'Informasi Pondok Pesantren Maskumambang dari mana?',
    guidance: 'Ketahui asal mula mengetahui informasi PSB Maskumambang: alumni, saudara, guru/sekolah asal, website/media sosial, brosur, atau lainnya.',
    sortOrder: 7,
  },
];

export const DEFAULT_ASPECTS = [
  { name: 'Motivasi & Komitmen Belajar', minScore: 1, maxScore: 10, defaultWeight: 15, sortOrder: 1 },
  { name: 'Pengamalan Ibadah Harian', minScore: 1, maxScore: 10, defaultWeight: 20, sortOrder: 2 },
  { name: 'Kemandirian Asrama', minScore: 1, maxScore: 10, defaultWeight: 20, sortOrder: 3 },
  { name: 'Akhlak & Kepribadian', minScore: 1, maxScore: 10, defaultWeight: 20, sortOrder: 4 },
  { name: 'Dukungan Keluarga & Finansial', minScore: 1, maxScore: 10, defaultWeight: 25, sortOrder: 5 },
];

async function main() {
  console.log('🚀 Seeding Default Interview Questions & Package (Idempotent)...');

  // 1. Seed Categories & Questions
  const questionRecords = [];
  for (const item of DEFAULT_QUESTIONS) {
    let cat = await prisma.interviewQuestionCategory.findFirst({
      where: { name: item.category },
    });
    if (!cat) {
      cat = await prisma.interviewQuestionCategory.create({
        data: {
          name: item.category,
          description: item.categoryDesc,
          sortOrder: item.sortOrder,
          isActive: true,
        },
      });
      console.log(`+ Kategori dibuat: ${cat.name}`);
    }

    let q = await prisma.interviewQuestion.findFirst({
      where: {
        categoryId: cat.id,
        question: item.question,
      },
    });
    if (!q) {
      q = await prisma.interviewQuestion.create({
        data: {
          categoryId: cat.id,
          question: item.question,
          interviewerGuidance: item.guidance,
          isActive: true,
        },
      });
      console.log(`+ Pertanyaan dibuat: ${q.question}`);
    } else {
      q = await prisma.interviewQuestion.update({
        where: { id: q.id },
        data: {
          interviewerGuidance: item.guidance,
          isActive: true,
        },
      });
    }
    questionRecords.push({ q, sortOrder: item.sortOrder });
  }

  // 2. Seed Default Aspects
  for (const asp of DEFAULT_ASPECTS) {
    const existing = await prisma.interviewAspect.findFirst({
      where: { name: asp.name },
    });
    if (!existing) {
      await prisma.interviewAspect.create({
        data: {
          name: asp.name,
          minScore: asp.minScore,
          maxScore: asp.maxScore,
          defaultWeight: asp.defaultWeight,
          sortOrder: asp.sortOrder,
          isActive: true,
        },
      });
      console.log(`+ Aspek dibuat: ${asp.name}`);
    }
  }

  // 3. Seed Default Package
  const pkgCode = 'PAKET-STANDAR-PSB';
  let pkg = await prisma.interviewPackage.findUnique({
    where: { code: pkgCode },
  });

  if (!pkg) {
    pkg = await prisma.interviewPackage.create({
      data: {
        code: pkgCode,
        name: 'Paket Standar Wawancara Santri Baru Maskumambang',
        description: '7 Pertanyaan Pokok Wawancara Standar Penerimaan Santri Baru Maskumambang',
        status: InterviewPackageStatus.ACTIVE,
      },
    });
    console.log(`+ Paket Wawancara dibuat: ${pkg.name}`);
  }

  // 4. Link questions to Package
  for (const item of questionRecords) {
    await prisma.interviewPackageQuestion.upsert({
      where: {
        packageId_questionId: {
          packageId: pkg.id,
          questionId: item.q.id,
        },
      },
      update: {
        sortOrder: item.sortOrder,
        isRequired: true,
        answerNoteMode: AnswerNoteMode.OPTIONAL,
      },
      create: {
        packageId: pkg.id,
        questionId: item.q.id,
        sortOrder: item.sortOrder,
        isRequired: true,
        answerNoteMode: AnswerNoteMode.OPTIONAL,
      },
    });
  }

  console.log('✅ Berhasil menyuntikkan 7 pertanyaan default wawancara & paket standar.');
}

main()
  .catch((err) => {
    console.error('❌ Error seeding interview defaults:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
