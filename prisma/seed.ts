import { PrismaClient, Role, ParticipantType, RegistrationStatus, PaymentStatus, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding data master ke PostgreSQL (Idempotent)...');

  // =========================================================================
  // 1. SEED DEFAULT USERS
  // =========================================================================
  console.log('👤 Seeding default users...');
  const saltRounds = 12;

  const defaultUsers = [
    {
      name: 'Super Administrator',
      email: 'rois@maskumambang.ac.id',
      phoneNumber: '081234567890',
      password: 'rois123',
      role: Role.SUPER_ADMIN,
    },
    {
      name: 'Bendahara Panitia',
      email: 'bendahara@lomba.id',
      phoneNumber: '081234567891',
      password: 'bendahara123',
      role: Role.BENDAHARA,
    },
    {
      name: 'Ahmad Fauzi (Peserta Demo)',
      email: 'peserta@lomba.id',
      phoneNumber: '081234567892',
      password: 'peserta123',
      role: Role.PESERTA,
    },
    {
      name: 'Ust. H. Ahmad Dahlan, Lc.',
      email: 'pewawancara@lomba.id',
      phoneNumber: '081234567895',
      password: 'pewawancara123',
      role: Role.PEWAWANCARA,
    },
  ];

  for (const u of defaultUsers) {
    const passwordHash = await bcrypt.hash(u.password, saltRounds);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        phoneNumber: u.phoneNumber,
        role: u.role,
        isActive: true,
      },
      create: {
        name: u.name,
        email: u.email,
        phoneNumber: u.phoneNumber,
        passwordHash,
        role: u.role,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${defaultUsers.length} Default users seeded successfully.`);

  // =========================================================================
  // 2. SEED OFFICIAL PAYMENT ACCOUNTS
  // =========================================================================
  console.log('💳 Seeding official payment accounts...');
  const paymentAccounts = [
    {
      bankName: 'Bank Central Asia (BCA)',
      accountNumber: '8830123456',
      accountHolder: 'Panitia Lomba Nasional 2026',
    },
    {
      bankName: 'Bank Mandiri',
      accountNumber: '1420019283746',
      accountHolder: 'Panitia Lomba Nasional 2026',
    },
    {
      bankName: 'Bank Syariah Indonesia (BSI)',
      accountNumber: '7123456789',
      accountHolder: 'Panitia Lomba Nasional 2026',
    },
    {
      bankName: 'Bank Rakyat Indonesia (BRI)',
      accountNumber: '001901002345501',
      accountHolder: 'Panitia Lomba Nasional 2026',
    },
  ];

  for (const acc of paymentAccounts) {
    const existing = await prisma.paymentAccount.findFirst({
      where: { accountNumber: acc.accountNumber },
    });

    if (existing) {
      await prisma.paymentAccount.update({
        where: { id: existing.id },
        data: {
          bankName: acc.bankName,
          accountHolder: acc.accountHolder,
          isActive: true,
        },
      });
    } else {
      await prisma.paymentAccount.create({
        data: {
          bankName: acc.bankName,
          accountNumber: acc.accountNumber,
          accountHolder: acc.accountHolder,
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ ${paymentAccounts.length} Official payment accounts seeded.`);

  // =========================================================================
  // 3. SEED APP SETTINGS (BRANDING & IDENTITY)
  // =========================================================================
  console.log('⚙️ Seeding application branding settings...');
  const defaultSettings = [
    {
      key: 'application_name',
      value: 'Pondok Pesantren Maskumambang',
    },
    {
      key: 'application_short_name',
      value: 'PSB MASKUMAMBANG',
    },
    {
      key: 'application_description',
      value: 'Sistem Penerimaan Peserta Didik Baru Terpadu Pondok Pesantren Maskumambang.',
    },
    {
      key: 'application_logo',
      value: 'logo_e7a8b6a95d.webp',
    },
    {
      key: 'application_favicon',
      value: 'favicon_87007b6344.webp',
    },
  ];

  for (const s of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  console.log(`✅ ${defaultSettings.length} App settings seeded.`);

  // =========================================================================
  // 3.5 SEED ACADEMIC PERIODS & ADMISSION WAVES (STAGE 2)
  // =========================================================================
  console.log('📅 Seeding Academic Periods & Admission Waves...');
  const activePeriod = await prisma.academicPeriod.upsert({
    where: { name: '2026/2027' },
    update: { isActive: true },
    create: {
      name: '2026/2027',
      isActive: true,
    },
  });

  const now = new Date();
  const startG1 = new Date(now.getFullYear(), 7, 1); // 1 Aug
  const endG1 = new Date(now.getFullYear() + 1, 11, 31); // 31 Des (aktif saat ini)
  const startG2 = new Date(now.getFullYear() + 1, 0, 1);
  const endG2 = new Date(now.getFullYear() + 1, 2, 31);

  const wave1 = await prisma.admissionWave.upsert({
    where: { id: 'wave-2026-gelombang-1' },
    update: {
      name: 'Gelombang 1',
      academicPeriodId: activePeriod.id,
      startDate: startG1,
      endDate: endG1,
      registrationFee: 500000.00,
      isActive: true,
    },
    create: {
      id: 'wave-2026-gelombang-1',
      academicPeriodId: activePeriod.id,
      name: 'Gelombang 1',
      waveNumber: 1,
      startDate: startG1,
      endDate: endG1,
      registrationFee: 500000.00,
      isActive: true,
    },
  });

  const wave2 = await prisma.admissionWave.upsert({
    where: { id: 'wave-2026-gelombang-2' },
    update: {
      name: 'Gelombang 2',
      academicPeriodId: activePeriod.id,
      startDate: startG2,
      endDate: endG2,
      registrationFee: 600000.00,
      isActive: true,
    },
    create: {
      id: 'wave-2026-gelombang-2',
      academicPeriodId: activePeriod.id,
      name: 'Gelombang 2',
      waveNumber: 2,
      startDate: startG2,
      endDate: endG2,
      registrationFee: 600000.00,
      isActive: true,
    },
  });
  console.log('✅ Academic Period 2026/2027 & 2 Admission Waves seeded.');

  // =========================================================================
  // 4. SEED PSB MASTER DATA: SCHOOLS, MAJORS, CLASS PROGRAMS
  // =========================================================================
  console.log('🏫 Seeding PSB Master Data (Schools, Majors, Class Programs)...');
  const psbTree = [
    {
      name: 'SMK Maskumambang',
      slug: 'smk-maskumambang',
      description: 'Sekolah Menengah Kejuruan Berbasis Pesantren dengan keahlian industri dan teknologi unggulan.',
      majors: [
        {
          name: 'Teknik Komputer & Jaringan (TKJ)',
          slug: 'tkj',
          classPrograms: [
            { name: 'Reguler', fee: 150000, description: 'Kelas Reguler Kurikulum Merdeka + Pesantren' },
            { name: 'Progresif', fee: 200000, description: 'Kelas Unggulan Sertifikasi Internasional & Industri' },
          ],
        },
        {
          name: 'Teknik Pemesinan',
          slug: 'pemesinan',
          classPrograms: [
            { name: 'Reguler', fee: 150000, description: 'Kelas Reguler Standar Industri Mesin' },
            { name: 'Progresif', fee: 200000, description: 'Kelas Unggulan CNC & Otomasi Manufaktur' },
          ],
        },
        {
          name: 'Perkapalan / Fabrikasi Logam',
          slug: 'perkapalan',
          classPrograms: [
            { name: 'Reguler', fee: 150000, description: 'Kelas Reguler Konstruksi & Pengelasan' },
            { name: 'Progresif', fee: 200000, description: 'Kelas Unggulan Sertifikasi 3G/6G Internasional' },
          ],
        },
      ],
    },
    {
      name: 'SMA Maskumambang',
      slug: 'sma-maskumambang',
      description: 'Sekolah Menengah Atas Berbasis Sains, Agama, dan Karakter Pemimpin Bangsa.',
      majors: [
        {
          name: 'MIPA (Matematika & IPA)',
          slug: 'mipa',
          classPrograms: [
            { name: 'Reguler', fee: 150000, description: 'Program Reguler Kurikulum Nasional + Diniyah' },
            { name: 'Progresif Sains', fee: 200000, description: 'Program Olimpiade & Riset Ilmiah' },
            { name: 'Tahfidz Unggulan', fee: 250000, description: 'Program Takhassus Al-Quran 30 Juz' },
          ],
        },
        {
          name: 'IPS (Ilmu Pengetahuan Sosial)',
          slug: 'ips',
          classPrograms: [
            { name: 'Reguler', fee: 150000, description: 'Program Reguler Sosial & Humaniora' },
            { name: 'Progresif Leadership', fee: 200000, description: 'Program Kepemimpinan & Entrepreneurship' },
          ],
        },
      ],
    },
    {
      name: 'MTs Maskumambang',
      slug: 'mts-maskumambang',
      description: 'Madrasah Tsanawiyah Unggulan Berkarakter Qurani dan Berwawasan Global.',
      majors: [
        {
          name: 'Program Pendidikan MTs',
          slug: 'mts-reguler',
          classPrograms: [
            { name: 'Reguler', fee: 150000, description: 'Kelas Reguler Terpadu' },
            { name: 'Bilingual Class', fee: 200000, description: 'Kelas Pengantar Bahasa Arab & Inggris' },
            { name: 'Tahfidz Al-Quran', fee: 250000, description: 'Program Khusus Menghafal Al-Quran' },
          ],
        },
      ],
    },
  ];

  let totalSchools = 0;
  let totalMajors = 0;
  let totalClassPrograms = 0;

  for (const sch of psbTree) {
    const school = await prisma.school.upsert({
      where: { slug: sch.slug },
      update: {
        name: sch.name,
        description: sch.description,
        isActive: true,
      },
      create: {
        name: sch.name,
        slug: sch.slug,
        description: sch.description,
        isActive: true,
      },
    });
    totalSchools++;

    for (const maj of sch.majors) {
      const major = await prisma.major.upsert({
        where: {
          schoolId_name: {
            schoolId: school.id,
            name: maj.name,
          },
        },
        update: {
          slug: maj.slug,
        },
        create: {
          schoolId: school.id,
          name: maj.name,
          slug: maj.slug,
        },
      });
      totalMajors++;

      for (const cp of maj.classPrograms) {
        await prisma.classProgram.upsert({
          where: {
            majorId_name: {
              majorId: major.id,
              name: cp.name,
            },
          },
          update: {
            registrationFee: cp.fee,
            description: cp.description,
            participantType: ParticipantType.INDIVIDUAL,
            isActive: true,
          },
          create: {
            majorId: major.id,
            name: cp.name,
            registrationFee: cp.fee,
            description: cp.description,
            participantType: ParticipantType.INDIVIDUAL,
            isActive: true,
          },
        });
        totalClassPrograms++;
      }
    }
  }

  console.log(`✅ Seeded ${totalSchools} Sekolah, ${totalMajors} Jurusan, and ${totalClassPrograms} Program Kelas.`);

  // =========================================================================
  // 5. SEED PSB TESTING DATASET (Calon Siswa, Registrations, Payments)
  // =========================================================================
  console.log('🧪 Seeding PSB testing dataset...');

  const testUsersData = [
    { name: 'Ahmad Dahlan', email: 'test.peserta01@lomba.id', phone: '081234567801' },
    { name: 'Budi Santoso', email: 'test.peserta02@lomba.id', phone: '081234567802' },
    { name: 'Citra Kirana', email: 'test.peserta03@lomba.id', phone: '081234567803' },
    { name: 'Dewi Sartika', email: 'test.peserta04@lomba.id', phone: '081234567804' },
    { name: 'Eko Prasetyo', email: 'test.peserta05@lomba.id', phone: '081234567805' },
    { name: 'Fajar Nugraha', email: 'test.peserta06@lomba.id', phone: '081234567806' },
  ];

  const allCPs = await prisma.classProgram.findMany({
    include: { major: { include: { school: true } } },
  });
  const firstAccount = await prisma.paymentAccount.findFirst();
  const bendaharaUser = await prisma.user.findUnique({ where: { email: 'bendahara@lomba.id' } });

  for (let i = 0; i < testUsersData.length; i++) {
    const tu = testUsersData[i];
    const passwordHash = await bcrypt.hash('password123', 10);
    const user = await prisma.user.upsert({
      where: { email: tu.email },
      update: { name: tu.name, phoneNumber: tu.phone, role: Role.PESERTA, isActive: true },
      create: { name: tu.name, email: tu.email, phoneNumber: tu.phone, passwordHash, role: Role.PESERTA, isActive: true },
    });

    const cp = allCPs[i % allCPs.length];
    const regNum = `PSB-2026-${String(i + 1).padStart(4, '0')}`;
    const qrToken = `QR-${regNum}-${tu.phone}`;

    // Status rotation: 0, 1 -> APPROVED & UNLOCKED; 2 -> WAITING_VERIFICATION; 3 -> PAYMENT_REJECTED
    let regStatus: RegistrationStatus = RegistrationStatus.WAITING_VERIFICATION;
    let payStatus: PaymentStatus = PaymentStatus.WAITING_VERIFICATION;
    let isUnlocked = false;

    if (i % 3 === 0 || i % 3 === 1) {
      regStatus = RegistrationStatus.APPROVED;
      payStatus = PaymentStatus.APPROVED;
      isUnlocked = true;
    } else if (i % 3 === 2) {
      regStatus = RegistrationStatus.PAYMENT_REJECTED;
      payStatus = PaymentStatus.REJECTED;
      isUnlocked = false;
    }

    let formStat: any = 'LOCKED';
    if (isUnlocked) formStat = 'DRAFT';

    const reg = await prisma.registration.upsert({
      where: { registrationNumber: regNum },
      update: {
        status: regStatus,
        isFormUnlocked: isUnlocked,
        academicPeriodId: activePeriod.id,
        admissionWaveId: wave1.id,
        formStatus: formStat,
      },
      create: {
        registrationNumber: regNum,
        qrCodeToken: qrToken,
        userId: user.id,
        classProgramId: cp.id,
        academicPeriodId: activePeriod.id,
        admissionWaveId: wave1.id,
        boardingStatus: 'MUKIM',
        status: regStatus,
        isFormUnlocked: isUnlocked,
        formStatus: formStat,
      },
    });

    await prisma.individualParticipant.upsert({
      where: { registrationId: reg.id },
      update: { fullName: tu.name, schoolName: `SMP Negeri ${i + 1} Gresik` },
      create: {
        registrationId: reg.id,
        fullName: tu.name,
        gender: i % 2 === 0 ? Gender.L : Gender.P,
        gradeClass: 'Kelas 9 SMP',
        schoolName: `SMP Negeri ${i + 1} Gresik`,
        schoolAddress: 'Jl. Raya Pendidikan No. ' + (i + 1) + ' Gresik',
        mentorName: 'Ayah / Wali ' + tu.name,
        whatsappNumber: tu.phone,
      },
    });

    // Payment record
    if (firstAccount) {
      const existingPay = await prisma.payment.findFirst({ where: { registrationId: reg.id } });
      let paymentId = existingPay?.id;
      if (!existingPay) {
        const p = await prisma.payment.create({
          data: {
            registrationId: reg.id,
            paymentAccountId: firstAccount.id,
            amount: cp.registrationFee,
            proofImagePath: 'sample_proof.png',
            senderBank: 'BCA',
            senderAccountName: tu.name,
            paymentDate: new Date(),
            status: payStatus,
            notes: regStatus === RegistrationStatus.PAYMENT_REJECTED ? 'Nominal transfer kurang Rp 50.000' : 'Pembayaran Biaya Formulir PSB 2026',
          },
        });
        paymentId = p.id;
      }

      if (paymentId && bendaharaUser && payStatus !== PaymentStatus.WAITING_VERIFICATION) {
        await prisma.paymentVerificationLog.create({
          data: {
            paymentId,
            verifiedByUserId: bendaharaUser.id,
            action: payStatus === PaymentStatus.APPROVED ? 'APPROVED' : 'REJECTED',
            rejectionReason: payStatus === PaymentStatus.REJECTED ? 'Nominal transfer tidak sesuai biaya pendaftaran program kelas.' : undefined,
          },
        });
      }
    }
  }

  console.log(`✅ Seeded ${testUsersData.length} Calon Siswa, Registrasi PSB, dan Bukti Pembayaran.`);
  console.log('🎉 PSB2 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

