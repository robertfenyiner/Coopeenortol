// ============================================================
// CoopManager - Script de Pruebas Exhaustivas
// Ejecuta flujo completo: Login → Asociado → Aportes → Crédito → Pagos
// ============================================================

const BASE = 'http://localhost:3000';
let cookies = '';

async function req(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    redirect: 'manual',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  // Capturar cookies de login
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookies = setCookie.map(c => c.split(';')[0]).join('; ');
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

function assert(condition, msg) {
  if (!condition) { console.error(`  ❌ FALLÓ: ${msg}`); process.exit(1); }
  console.log(`  ✅ ${msg}`);
}

// Limpieza de datos de pruebas anteriores
async function cleanup() {
  console.log('🧹 Limpiando datos de pruebas anteriores...');
  // Eliminar asociados de prueba (cascade elimina contributions, credits, etc.)
  for (const doc of ['1098765432', '2098765433']) {
    const res = await req('GET', `/api/asociados?search=${doc}&page=1&pageSize=10`);
    if (res.data?.success && res.data?.data?.data) {
      for (const assoc of res.data.data.data) {
        const delRes = await req('DELETE', `/api/asociados/${assoc.id}`);
        if (delRes.status === 200) {
          console.log(`  🗑️  Asociado ${assoc.associateNumber} eliminado`);
        }
      }
    }
  }
  console.log('  ✅ Limpieza completada\n');
}

async function runTests() {
  console.log('═══════════════════════════════════════════');
  console.log('  CoopManager - Pruebas Exhaustivas');
  console.log('═══════════════════════════════════════════\n');

  // ========================================
  // 1. LOGIN
  // ========================================
  console.log('📋 1. LOGIN');
  const loginRes = await req('POST', '/api/auth/callback/credentials', {
    email: 'admin@coopeenortol.com',
    password: 'Admin123!',
    csrfToken: '',
    json: 'true',
  });
  // NextAuth usa redirect, intentemos obtener session via CSRF
  const csrfRes = await req('GET', '/api/auth/csrf');
  const csrfToken = csrfRes.data?.csrfToken || '';

  // Login via POST con CSRF
  const loginRes2 = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies },
    body: `email=admin@coopeenortol.com&password=Admin123!&csrfToken=${csrfToken}`,
    redirect: 'manual',
  });
  const loginCookies = loginRes2.headers.getSetCookie?.() || [];
  if (loginCookies.length) cookies = loginCookies.map(c => c.split(';')[0]).join('; ');
  
  // Verificar sesión
  const sessionRes = await req('GET', '/api/auth/session');
  assert(sessionRes.data?.user?.email === 'admin@coopeenortol.com', 'Login exitoso como admin');
  assert(sessionRes.data?.user?.permissions?.length > 0, `${sessionRes.data?.user?.permissions?.length} permisos cargados`);

  // Limpieza antes de crear nuevos datos
  await cleanup();

  // ========================================
  // 2. DASHBOARD
  // ========================================
  console.log('\n📋 2. DASHBOARD');
  const dashRes = await req('GET', '/api/dashboard');
  assert(dashRes.data?.success === true, 'API Dashboard responde correctamente');
  assert(typeof dashRes.data?.data?.associates?.active === 'number', 'KPI Asociados activos presente');
  assert(typeof dashRes.data?.data?.savings?.totalBalance === 'number', 'KPI Total Ahorros presente');
  console.log(`  📊 Asociados: ${dashRes.data.data.associates.active} | Ahorros: $${dashRes.data.data.savings.totalBalance}`);

  // ========================================
  // 3. CREAR ASOCIADO
  // ========================================
  console.log('\n📋 3. CREAR ASOCIADO');
  const assocData = {
    documentType: 'CC',
    documentNumber: '1098765432',
    firstName: 'Juan',
    lastName: 'Pérez',
    secondLastName: 'García',
    gender: 'M',
    birthDate: '1990-05-15',
    maritalStatus: 'SOLTERO',
    email: 'juan.perez@test.com',
    phone: '6017654321',
    mobilePhone: '3101234567',
    address: 'Calle 45 #12-34, Bogotá',
    city: 'Bogotá',
    department: 'Cundinamarca',
    housingType: 'PROPIA',
    occupation: 'Ingeniero de Sistemas',
    employer: 'Tech Solutions S.A.S.',
    jobTitle: 'Desarrollador Senior',
    monthlyIncome: 5500000,
    observations: 'Asociado de prueba creado por script de testing',
  };
  const createAssoc = await req('POST', '/api/asociados', assocData);
  assert(createAssoc.data?.success === true, 'Asociado creado exitosamente');
  const associateId = createAssoc.data?.data?.id;
  const associateNumber = createAssoc.data?.data?.associateNumber;
  assert(!!associateId, `ID: ${associateId}`);
  assert(associateNumber?.startsWith('ASO-'), `Número: ${associateNumber}`);

  // Activar asociado
  const activateRes = await req('PATCH', `/api/asociados/${associateId}`, { status: 'ACTIVO', reason: 'Aprobado por testing' });
  assert(activateRes.data?.success === true, 'Asociado activado correctamente');

  // Verificar detalle
  const detailRes = await req('GET', `/api/asociados/${associateId}`);
  assert(detailRes.data?.data?.status === 'ACTIVO', 'Estado confirmado: ACTIVO');
  assert(detailRes.data?.data?.person?.firstName === 'Juan', 'Nombre confirmado: Juan');

  // Crear segundo asociado
  const assocData2 = {
    documentType: 'CC', documentNumber: '2098765433',
    firstName: 'María', lastName: 'López',
    email: 'maria.lopez@test.com', mobilePhone: '3207654321',
    city: 'Medellín', department: 'Antioquia',
    monthlyIncome: 3800000,
  };
  const createAssoc2 = await req('POST', '/api/asociados', assocData2);
  assert(createAssoc2.data?.success === true, 'Segundo asociado (María) creado');
  const associate2Id = createAssoc2.data?.data?.id;
  await req('PATCH', `/api/asociados/${associate2Id}`, { status: 'ACTIVO' });

  // Beneficiario
  const benefRes = await req('POST', `/api/asociados/${associateId}/beneficiarios`, {
    fullName: 'Ana Pérez García', relationship: 'CONYUGE', percentage: 60, phone: '3159876543',
  });
  assert(benefRes.data?.success === true, 'Beneficiario agregado');

  const benefRes2 = await req('POST', `/api/asociados/${associateId}/beneficiarios`, {
    fullName: 'Carlos Pérez García', relationship: 'HIJO', percentage: 40, phone: null,
  });
  assert(benefRes2.data?.success === true, 'Segundo beneficiario agregado (100% total)');

  // Listar asociados
  const listAssoc = await req('GET', '/api/asociados?page=1&pageSize=10');
  assert(listAssoc.data?.success === true, 'Listado de asociados funciona');
  assert(listAssoc.data?.data?.total >= 2, `${listAssoc.data?.data?.total} asociado(s) en total`);

  // Buscar por nombre
  const searchRes = await req('GET', '/api/asociados?search=Juan&page=1&pageSize=10');
  assert(searchRes.data?.data?.total >= 1, 'Búsqueda por nombre funciona');

  // ========================================
  // 4. APORTES
  // ========================================
  console.log('\n📋 4. APORTES');
  
  // Aporte ordinario
  const aporte1 = await req('POST', '/api/aportes', {
    associateId, type: 'ORDINARIO', amount: 250000, paymentMethod: 'EFECTIVO',
  });
  assert(aporte1.data?.success === true, 'Aporte ordinario de $250,000 registrado');

  // Aporte extraordinario
  const aporte2 = await req('POST', '/api/aportes', {
    associateId, type: 'EXTRAORDINARIO', amount: 500000, paymentMethod: 'TRANSFERENCIA',
  });
  assert(aporte2.data?.success === true, 'Aporte extraordinario de $500,000 registrado');

  // Cuota de ingreso
  const aporte3 = await req('POST', '/api/aportes', {
    associateId, type: 'CUOTA_INGRESO', amount: 100000, paymentMethod: 'EFECTIVO',
  });
  assert(aporte3.data?.success === true, 'Cuota de ingreso de $100,000 registrada');

  // Aportes para María
  const aporte4 = await req('POST', '/api/aportes', {
    associateId: associate2Id, type: 'ORDINARIO', amount: 180000, paymentMethod: 'EFECTIVO',
  });
  assert(aporte4.data?.success === true, 'Aporte de María $180,000 registrado');

  // Verificar saldo
  const aportesCheck = await req('GET', `/api/asociados/${associateId}/aportes`);
  assert(aportesCheck.data?.success === true, 'Consulta de aportes del asociado funciona');
  const totalBalance = Number(aportesCheck.data?.data?.totalBalance || 0);
  assert(totalBalance === 850000, `Saldo ahorros: $${totalBalance.toLocaleString()} (esperado: $850,000)`);
  console.log(`  💰 Saldo cuenta de ahorros: $${totalBalance.toLocaleString('es-CO')}`);

  // Listar aportes
  const listAportes = await req('GET', '/api/aportes?page=1&pageSize=10');
  assert(listAportes.data?.success === true, 'Listado de aportes funciona');
  assert(listAportes.data?.data?.total >= 4, `${listAportes.data?.data?.total} aportes registrados`);

  // Anular un aporte
  const aporteId = aporte2.data?.data?.id;
  if (aporteId) {
    const anularRes = await req('PATCH', `/api/aportes/${aporteId}`, { action: 'ANULAR', reason: 'Error de digitación - prueba' });
    assert(anularRes.data?.success === true, 'Aporte de $500,000 anulado correctamente');

    // Verificar saldo actualizado
    const saldoPost = await req('GET', `/api/asociados/${associateId}/aportes`);
    const newBalance = Number(saldoPost.data?.data?.totalBalance || 0);
    assert(newBalance === 350000, `Saldo tras anulación: $${newBalance.toLocaleString()} (esperado: $350,000)`);
    console.log(`  💰 Saldo tras anulación: $${newBalance.toLocaleString('es-CO')}`);
  }

  // ========================================
  // 5. CRÉDITOS
  // ========================================
  console.log('\n📋 5. CRÉDITOS');
  
  // Solicitar crédito
  const creditReq = await req('POST', '/api/creditos', {
    associateId,
    creditLine: 'LIBRE_INVERSION',
    requestedAmount: 5000000,
    termMonths: 12,
    interestRate: 1.5,
    paymentFrequency: 'MENSUAL',
    purpose: 'Compra de equipo de cómputo para trabajo remoto',
    guaranteeType: 'FIADOR',
    guaranteeDescription: 'María López - CC 2098765433',
    observations: 'Crédito de prueba para testing',
  });
  assert(creditReq.data?.success === true, 'Solicitud de crédito creada');
  const creditId = creditReq.data?.data?.id;
  const creditNumber = creditReq.data?.data?.creditNumber;
  assert(creditNumber?.startsWith('CRE-'), `Número de crédito: ${creditNumber}`);

  // Verificar detalle
  const creditDetail = await req('GET', `/api/creditos/${creditId}`);
  assert(creditDetail.data?.data?.status === 'SOLICITUD', 'Estado: SOLICITUD');

  // Aprobar crédito
  const approveRes = await req('PATCH', `/api/creditos/${creditId}`, {
    action: 'approve',
    approvedAmount: 5000000,
    approvedTermMonths: 12,
    approvedInterestRate: 1.5,
    approvalNotes: 'Aprobado: buen historial crediticio',
  });
  assert(approveRes.data?.success === true, 'Crédito aprobado exitosamente');

  // Verificar amortización generada
  const creditAfterApproval = await req('GET', `/api/creditos/${creditId}`);
  assert(creditAfterApproval.data?.data?.status === 'APROBADO', 'Estado: APROBADO');
  const amortEntries = creditAfterApproval.data?.data?.amortization || [];
  assert(amortEntries.length === 12, `Tabla de amortización: ${amortEntries.length} cuotas (esperado: 12)`);
  const cuota1 = Number(amortEntries[0]?.totalAmount || 0);
  console.log(`  📅 Cuota mensual: $${cuota1.toLocaleString('es-CO')} (${amortEntries.length} cuotas)`);

  // Desembolsar
  const disburseRes = await req('PATCH', `/api/creditos/${creditId}`, {
    action: 'disburse',
    disbursementNotes: 'Desembolsado a cuenta bancaria del asociado',
  });
  assert(disburseRes.data?.success === true, 'Crédito desembolsado');

  // Verificar estado VIGENTE
  const creditAfterDisburse = await req('GET', `/api/creditos/${creditId}`);
  assert(creditAfterDisburse.data?.data?.status === 'VIGENTE', 'Estado: VIGENTE');
  const outstanding = Number(creditAfterDisburse.data?.data?.outstandingBalance || 0);
  assert(outstanding === 5000000, `Saldo pendiente: $${outstanding.toLocaleString()}`);

  // Registrar pago de primera cuota
  const paymentRes = await req('POST', `/api/creditos/${creditId}/pagos`, {
    amount: cuota1,
    paymentMethod: 'TRANSFERENCIA',
    reference: 'TRF-2026-001',
    observations: 'Pago primera cuota',
  });
  assert(paymentRes.data?.success === true, `Pago de cuota $${cuota1.toLocaleString()} registrado`);

  // Verificar saldo actualizado
  const creditAfterPayment = await req('GET', `/api/creditos/${creditId}`);
  const newOutstanding = Number(creditAfterPayment.data?.data?.outstandingBalance || 0);
  assert(newOutstanding < outstanding, `Saldo reducido: $${newOutstanding.toLocaleString()} (de $${outstanding.toLocaleString()})`);
  console.log(`  💳 Saldo tras pago: $${newOutstanding.toLocaleString('es-CO')}`);

  // Segundo pago
  const pay2 = await req('POST', `/api/creditos/${creditId}/pagos`, {
    amount: cuota1, paymentMethod: 'EFECTIVO', reference: 'EF-2026-002',
  });
  assert(pay2.data?.success === true, 'Segundo pago registrado');

  // Solicitar un segundo crédito (para María, que se rechazará)
  const credit2Req = await req('POST', '/api/creditos', {
    associateId: associate2Id,
    creditLine: 'EDUCACION',
    requestedAmount: 2000000,
    termMonths: 6,
    interestRate: 1.2,
    paymentFrequency: 'MENSUAL',
    purpose: 'Estudios de posgrado',
  });
  assert(credit2Req.data?.success === true, 'Segunda solicitud de crédito creada (María)');
  const credit2Id = credit2Req.data?.data?.id;

  // Rechazar
  const rejectRes = await req('PATCH', `/api/creditos/${credit2Id}`, {
    action: 'reject',
    rejectionReason: 'Ingresos insuficientes para el monto solicitado',
  });
  assert(rejectRes.data?.success === true, 'Crédito de María rechazado');
  const credit2After = await req('GET', `/api/creditos/${credit2Id}`);
  assert(credit2After.data?.data?.status === 'RECHAZADO', 'Estado: RECHAZADO');

  // Listar créditos
  const listCreditos = await req('GET', '/api/creditos?page=1&pageSize=10');
  assert(listCreditos.data?.success === true, 'Listado de créditos funciona');
  assert(listCreditos.data?.data?.total >= 2, `${listCreditos.data?.data?.total} créditos en total`);

  // ========================================
  // 6. CARTERA
  // ========================================
  console.log('\n📋 6. CARTERA');
  const carteraRes = await req('GET', '/api/cartera');
  assert(carteraRes.data?.success === true, 'API Cartera responde correctamente');
  const portfolio = carteraRes.data?.data;
  console.log(`  📊 Créditos activos: ${portfolio?.summary?.totalActiveCredits}`);
  console.log(`  📊 Cartera total: $${portfolio?.summary?.totalOutstanding?.toLocaleString('es-CO')}`);
  console.log(`  📊 Índice de mora: ${portfolio?.summary?.overduePercent}%`);
  assert(portfolio?.summary?.totalActiveCredits >= 1, 'Al menos 1 crédito activo en cartera');

  // ========================================
  // 7. DASHBOARD (con datos)
  // ========================================
  console.log('\n📋 7. DASHBOARD (con datos reales)');
  const dashRes2 = await req('GET', '/api/dashboard');
  const dashData = dashRes2.data?.data;
  assert(dashData?.associates?.active >= 2, `Asociados activos: ${dashData?.associates?.active}`);
  assert(dashData?.savings?.totalBalance > 0, `Total ahorros: $${dashData?.savings?.totalBalance?.toLocaleString('es-CO')}`);
  assert(dashData?.credits?.totalOutstanding > 0, `Cartera créditos: $${dashData?.credits?.totalOutstanding?.toLocaleString('es-CO')}`);
  console.log(`  📊 Asociados: ${dashData?.associates?.active} | Ahorros: $${dashData?.savings?.totalBalance?.toLocaleString('es-CO')} | Cartera: $${dashData?.credits?.totalOutstanding?.toLocaleString('es-CO')}`);

  // ========================================
  // 8. REPORTES
  // ========================================
  console.log('\n📋 8. REPORTES');
  const repAssoc = await req('GET', '/api/asociados?page=1&pageSize=100');
  assert(repAssoc.data?.success === true, 'Reporte de asociados: datos disponibles');
  
  const repAportes = await req('GET', '/api/aportes?page=1&pageSize=100');
  assert(repAportes.data?.success === true, 'Reporte de aportes: datos disponibles');
  
  const repCreditos = await req('GET', '/api/creditos?page=1&pageSize=100');
  assert(repCreditos.data?.success === true, 'Reporte de créditos: datos disponibles');

  // ========================================
  // 9. PERFIL
  // ========================================
  console.log('\n📋 9. PERFIL');
  const perfilRes = await req('GET', '/api/perfil');
  assert(perfilRes.data?.success === true, 'API Perfil responde');
  assert(perfilRes.data?.data?.email === 'admin@coopeenortol.com', 'Email correcto');
  assert(perfilRes.data?.data?.roles?.length > 0, `Roles: ${perfilRes.data?.data?.roles?.map(r => r.name).join(', ')}`);

  // ========================================
  // 10. AUDITORÍA
  // ========================================
  console.log('\n📋 10. AUDITORÍA');
  const auditRes = await req('GET', '/api/auditoria?page=1&pageSize=50');
  assert(auditRes.data?.success === true, 'API Auditoría responde');
  const auditCount = auditRes.data?.data?.total || 0;
  assert(auditCount > 0, `${auditCount} registros de auditoría`);
  console.log(`  📝 Total registros de auditoría: ${auditCount}`);

  // ========================================
  // 11. PARAMETRIZACIÓN
  // ========================================
  console.log('\n📋 11. PARAMETRIZACIÓN');
  const catalogsRes = await req('GET', '/api/parametrizacion/catalogos');
  assert(catalogsRes.data?.success === true, 'Catálogos del sistema accesibles');
  const catalogs = catalogsRes.data?.data?.data || [];
  const catalogsTotal = catalogsRes.data?.data?.total || 0;
  assert(catalogsTotal >= 11, `${catalogsTotal} catálogos del sistema`);

  const configRes = await req('GET', '/api/parametrizacion/config');
  assert(configRes.data?.success === true, 'Configuración del sistema accesible');

  // ========================================
  // 12. USUARIOS Y ROLES
  // ========================================
  console.log('\n📋 12. USUARIOS Y ROLES');
  const usersRes = await req('GET', '/api/usuarios?page=1&pageSize=10');
  assert(usersRes.data?.success === true, 'Listado de usuarios funciona');

  const rolesRes = await req('GET', '/api/roles');
  assert(rolesRes.data?.success === true, 'Listado de roles funciona');
  const rolesCount = rolesRes.data?.data?.total || 0;
  assert(rolesCount >= 7, `${rolesCount} roles del sistema`);

  const permRes = await req('GET', '/api/permisos');
  assert(permRes.data?.success === true, 'Listado de permisos funciona');
  const permCount = permRes.data?.data?.length || 0;
  assert(permCount >= 34, `${permCount} permisos del sistema`);

  // ========================================
  // RESUMEN FINAL
  // ========================================
  console.log('\n═══════════════════════════════════════════');
  console.log('  🎉 TODAS LAS PRUEBAS PASARON');
  console.log('═══════════════════════════════════════════');
  console.log(`
  Resumen de datos creados:
  • 2 asociados (Juan Pérez + María López)
  • 2 beneficiarios para Juan
  • 4 aportes ($850,000 → $350,000 tras anulación)
  • 2 créditos (1 vigente, 1 rechazado)
  • 2 pagos de cuota al crédito vigente
  • ${auditCount}+ registros de auditoría
  • ${catalogsTotal} catálogos, ${permCount} permisos, ${rolesCount} roles
  `);
}

runTests().catch(e => { console.error('💥 Error fatal:', e); process.exit(1); });
