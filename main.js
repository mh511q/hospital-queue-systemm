// تعريف العيادات وبيانات تسجيل الدخول (مشفرة)
const CLINICS = [
  { id: 1, name: 'عيادة 1', username: 'Y2xpbmljMQ==', password: 'MTIzNDU=' },
  { id: 2, name: 'عيادة 2', username: 'Y2xpbmljMg==', password: 'MTIzNDU=' },
  { id: 3, name: 'عيادة 3', username: 'Y2xpbmljMw==', password: 'MTIzNDU=' },
];


function decodeBase64(str) 
{
  try 
  {
    return atob(str);
  } catch (e) 
  {
    return str;  
  }
}


// -----------------------------------------------------------
// وظائف مشتركة
// -----------------------------------------------------------

// تهيئة البيانات الأولية في Firebase إذا لم تكن موجودة
function initFirebaseData() {
  if (!database) return;
  database.ref('clinicsStatus').once('value', snapshot => {
    if (!snapshot.exists()) {
      database.ref('clinicsStatus').set({ 1: false, 2: false, 3: false });
    }
  });
  database.ref('patients').once('value', snapshot => {
    if (!snapshot.exists()) {
      database.ref('patients').set({});
    }
  });
  database.ref('serialNumber').once('value', snapshot => {
    if (!snapshot.exists()) {
      database.ref('serialNumber').set(1);
    }
  });
}

// عرض حالة العيادات في صفحة الاستقبال
function renderClinicsList(clinicsStatus) {
  const clinicsList = document.getElementById('clinics-list');
  if (!clinicsList) return;
  
  clinicsList.innerHTML = '';
  CLINICS.forEach(clinic => {
    const statusDiv = document.createElement('div');
    const isAvailable = clinicsStatus && clinicsStatus[clinic.id];
    statusDiv.className = `clinic-status ${isAvailable ? 'status-available' : 'status-unavailable'}`;
    statusDiv.textContent = `${clinic.name}: ${isAvailable ? 'متاحة' : 'غير متاحة'}`;
    clinicsList.appendChild(statusDiv);
  });
}

// ملء قائمة الاختيار في صفحة الاستقبال بالعيادات المتاحة
function renderClinicSelect(clinicsStatus) {
  const clinicSelect = document.getElementById('clinic-select');
  if (!clinicSelect) return;
  
  clinicSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'اختر عيادة';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  clinicSelect.appendChild(defaultOption);
  
  CLINICS.forEach(clinic => {
    if (clinicsStatus && clinicsStatus[clinic.id]) {
      const option = document.createElement('option');
      option.value = clinic.id;
      option.textContent = clinic.name;
      clinicSelect.appendChild(option);
    }
  });
}

// -----------------------------------------------------------
// صفحة الاستقبال
// -----------------------------------------------------------
if (document.body.contains(document.getElementById('clinics-list')) && database) {
  initFirebaseData();
  
  database.ref('clinicsStatus').on('value', (snapshot) => {
    const clinicsStatus = snapshot.val();
    renderClinicsList(clinicsStatus);
    renderClinicSelect(clinicsStatus);
  });

  database.ref('serialNumber').on('value', (snapshot) => {
    const serial = snapshot.val();
    if (serial) {
      document.getElementById('current-serial').textContent = serial;
    }
  });

  document.getElementById('register-form').onsubmit = function(e) {
    e.preventDefault();
    const clinicSelect = document.getElementById('clinic-select');
    if (!clinicSelect.value) {
      alert('الرجاء اختيار عيادة.');
      return;
    }
    const clinicId = parseInt(clinicSelect.value, 10);
    
    database.ref('serialNumber').transaction((currentSerial) => {
      const serial = currentSerial || 1;
      
      const newPatient = {
        serial: serial,
        clinicId: clinicId,
        timestamp: Date.now()
      };
      
      database.ref('patients').push(newPatient);
      
      alert('تم تسجيل المريض بنجاح! رقمك: ' + serial);
      return serial + 1;
    });
  };

  document.getElementById('reset-serial').onclick = function() {
    if (confirm('هل أنت متأكد من إعادة ضبط الرقم التسلسلي؟')) {
      database.ref('serialNumber').set(1);
    }
  };

  document.getElementById('print-btn').onclick = function() {
    window.print();
  };
}

// -----------------------------------------------------------
// صفحة دخول العيادة
// -----------------------------------------------------------
if (document.body.contains(document.getElementById('clinic-login-form')) && database) {
  document.getElementById('clinic-login-form').onsubmit = function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    const clinic = CLINICS.find(c => decodeBase64(c.username) === username && decodeBase64(c.password) === password);
    
    if (clinic) {
      database.ref('clinicsStatus/' + clinic.id).set(true)
        .then(() => {
          localStorage.setItem('loggedInClinicId', clinic.id);
          window.location.href = 'clinic.html';
        })
        .catch(error => {
          errorDiv.textContent = 'حدث خطأ: ' + error.message;
        });
    } else {
      errorDiv.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة.';
    }
  };
}

// -----------------------------------------------------------
// صفحة العيادة
// -----------------------------------------------------------
if (document.body.contains(document.getElementById('clinic-patients')) && database) {
  const loggedInClinicId = localStorage.getItem('loggedInClinicId');

  if (!loggedInClinicId) {
    window.location.href = 'clinic-login.html';
  } else {
    document.getElementById('clinic-title').textContent = `لوحة ${CLINICS.find(c => c.id == loggedInClinicId).name}`;
    
    database.ref('patients').orderByChild('clinicId').equalTo(Number(loggedInClinicId)).on('value', (snapshot) => {
      const patientsData = snapshot.val();
      const patients = patientsData ? Object.entries(patientsData).map(([key, value]) => ({...value, key})) : [];
      patients.sort((a, b) => a.serial - b.serial);
      renderClinicPatients(patients);
    });

    // **هنا التعديل الرئيسي في كيفية التعامل مع تسجيل الخروج**
    document.getElementById('logout-btn').onclick = function() {
      const clinicToLogOut = Number(loggedInClinicId);
      
      // الأولوية 1: تحديث حالة العيادة أولاً والانتظار حتى يتم الانتهاء
      database.ref('clinicsStatus/' + clinicToLogOut).set(false)
        .then(() => {
          console.log(`تم تغيير حالة العيادة ${clinicToLogOut} إلى غير متاحة.`);
          
          // الأولوية 2: بعد الانتهاء، جلب البيانات المحدثة بالكامل
          return Promise.all([
            database.ref('patients').once('value'),
            database.ref('clinicsStatus').once('value')
          ]);
        })
        .then(([patientsSnapshot, clinicsStatusSnapshot]) => {
          const patientsData = patientsSnapshot.val() || {};
          const allPatients = Object.entries(patientsData).map(([key, value]) => ({ ...value, key }));
          const clinicsStatus = clinicsStatusSnapshot.val() || {};
          
          // الأولوية 3: الآن نقوم بإعادة التوزيع باستخدام البيانات المحدثة
          return redistributePatients(clinicToLogOut, allPatients, clinicsStatus);
        })
        .then(() => {
          console.log('عملية إعادة التوزيع وتسجيل الخروج تمت بنجاح.');
          localStorage.removeItem('loggedInClinicId');
          window.location.href = 'clinic-login.html';
        })
        .catch(error => {
          console.error("خطأ أثناء تسجيل الخروج أو إعادة التوزيع:", error);
          // في حال حدوث أي خطأ، مازلنا نسجل الخروج لإبقاء التطبيق مستقراً
          localStorage.removeItem('loggedInClinicId');
          window.location.href = 'clinic-login.html';
        });
    };
  }
}

// عرض المرضى في صفحة العيادة
function renderClinicPatients(patients) {
  const container = document.getElementById('clinic-patients');
  if (!container) return;
  
  container.innerHTML = '<h3>قائمة المرضى</h3>';
  
  if (patients.length === 0) {
    container.innerHTML += '<p>لا يوجد مرضى في هذه العيادة حاليًا.</p>';
  } else {
    patients.forEach((p, index) => {
      const patientDiv = document.createElement('div');
      const isCurrent = index === 0;
      patientDiv.className = `patient-row ${isCurrent ? 'current' : 'waiting'}`;
      
      const statusText = isCurrent ? 'دورك الآن' : 'انتظار';
      
      patientDiv.innerHTML = `
        <span>رقم المريض: ${p.serial}</span>
        <span><span class="status ${isCurrent ? 'current' : 'waiting'}">${statusText}</span></span>
        <div class="patient-actions">
          <button onclick="finishPatient('${p.key}')">تم الفحص</button>
          <button onclick="movePatient('${p.key}')">تعديل العيادة</button>
        </div>
      `;
      container.appendChild(patientDiv);
    });
  }
}

// وظائف التحكم بالمرضى (تعديل/حذف/نقل)
window.finishPatient = function(patientKey) {
  if (database) {
    database.ref('patients/' + patientKey).remove();
  }
};
window.movePatient = function(patientKey) {
  const newClinicId = prompt('ادخل رقم العيادة الجديدة (1, 2, أو 3):');
  if (database && [1, 2, 3].includes(Number(newClinicId))) {
    database.ref('patients/' + patientKey).update({ clinicId: Number(newClinicId) });
  } else {
    alert('رقم عيادة غير صحيح أو لم يتم الاتصال بقاعدة البيانات.');
  }
};

// وظيفة إعادة توزيع المرضى (تم تعديلها لاستقبال البيانات كمعاملات)
async function redistributePatients(closedClinicId, allPatients, clinicsStatus) {
  if (!database) {
    console.error("قاعدة البيانات غير مهيأة.");
    return;
  }
  
  try {
    const toMove = allPatients.filter(p => p.clinicId === closedClinicId).sort((a, b) => a.serial - b.serial);
    const availableClinics = CLINICS.filter(c => clinicsStatus[c.id] === true);

    if (toMove.length > 0 && availableClinics.length > 0) {
      console.log(`يوجد ${toMove.length} مريض لنقلهم من العيادة ${closedClinicId}.`);
      console.log(`العيادات المتاحة: ${availableClinics.map(c => c.id).join(', ')}`);
      
      const updates = {};
      let availableClinicIndex = 0;

      toMove.forEach(p => {
        const newClinicId = availableClinics[availableClinicIndex % availableClinics.length].id;
        updates['patients/' + p.key + '/clinicId'] = newClinicId;
        console.log(`نقل المريض رقم ${p.serial} إلى العيادة ${newClinicId}`);
        availableClinicIndex++;
      });
      
      await database.ref().update(updates);
      console.log("تمت إعادة توزيع المرضى بنجاح.");
    } else if (toMove.length > 0) {
      console.log('لا توجد عيادات متاحة لإعادة توزيع المرضى. المرضى سيبقون في العيادة.');
    } else {
      console.log('لا يوجد مرضى في العيادة لتوزيعهم.');
    }
  } catch (error) {
    console.error("خطأ في إعادة توزيع المرضى:", error);
  }
}

// -----------------------------------------------------------
// صفحة العرض
// -----------------------------------------------------------
if (document.body.contains(document.getElementById('clinics-tables')) && database) {
  // الاستماع الموحد للتغييرات
  database.ref('/').on('value', (snapshot) => {
    const data = snapshot.val();
    const patientsData = data.patients || {};
    const clinicsStatus = data.clinicsStatus || {};
    renderDisplayTables(patientsData, clinicsStatus);
  });

  function renderDisplayTables(patientsSnapshot, clinicsStatusSnapshot) {
    const container = document.getElementById('clinics-tables');
    if (!container) return;
    
    container.innerHTML = '';
    
    const patients = patientsSnapshot ? Object.entries(patientsSnapshot).map(([key, value]) => ({...value, key})) : [];
    const clinicsStatus = clinicsStatusSnapshot ? clinicsStatusSnapshot : {};
    
    CLINICS.forEach(clinic => {
      const clinicPatients = patients.filter(p => p.clinicId === clinic.id).sort((a, b) => a.serial - b.serial);
      
      const tableDiv = document.createElement('div');
      tableDiv.className = 'clinic-table';
      
      const isAvailable = clinicsStatus && clinicsStatus[clinic.id];
      const statusText = isAvailable ? ' (متاحة)' : ' (غير متاحة)';
      
      const tableTitle = document.createElement('h3');
      tableTitle.textContent = `${clinic.name}${statusText}`;
      tableDiv.appendChild(tableTitle);
      
      if (clinicPatients.length === 0) {
        tableDiv.innerHTML += '<p style="text-align: center; padding: 10px;">لا يوجد مرضى حالياً.</p>';
      } else {
        clinicPatients.forEach((p, index) => {
          const patientEntry = document.createElement('div');
          patientEntry.className = 'patient-entry';
          
          const statusClass = index === 0 ? 'current' : 'waiting';
          const statusText = index === 0 ? 'دورك الآن' : 'انتظار';
          
          patientEntry.innerHTML = `
            <span>الرقم: ${p.serial}</span>
            <span class="status ${statusClass}">${statusText}</span>
          `;
          tableDiv.appendChild(patientEntry);
        });
      }
      
      container.appendChild(tableDiv);
    });
  }
}