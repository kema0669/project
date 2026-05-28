import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import {
  approveStudent,
  confirmUpload,
  fetchStudentApprovals,
  fetchStudentDiagnosis,
  fetchStudentResults,
  fetchStudentStatus,
  fetchTeacherClasses,
  login,
  previewUpload,
  registerStudent,
  rejectStudent,
} from './data/mock';
import type {
  AccountStatus,
  AuthUser,
  ConfirmImportResult,
  LoadingState,
  StudentApproval,
  StudentDiagnosis,
  StudentRegistrationResult,
  StudentResult,
  StudentStatus,
  TeacherClass,
  UploadPreview,
} from './types';
import styles from './App.module.css';

type Session = {
  token: string;
  user: AuthUser;
};

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function sampleCsv(): string {
  const headers = [
    'student_no',
    'student_name',
    'class_name',
    'exam_name',
    ...Array.from({ length: 20 }, (_, index) => `q${index + 1}`),
  ];
  const rows = [
    ['S001', '张三', 'Class A', 'DINA Diagnostic Quiz', ...Array.from({ length: 20 }, (_, index) => (index % 3 === 0 ? 0 : 1))],
    ['S002', '李四', 'Class A', 'DINA Diagnostic Quiz', ...Array.from({ length: 20 }, (_, index) => (index % 2 === 0 ? 1 : 0))],
  ];
  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

function statusText(status: AccountStatus): string {
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已拒绝';
  return '待审核';
}

function MasteryRadar({ diagnosis }: { diagnosis: StudentDiagnosis }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) chartInstance.current = echarts.init(chartRef.current);
    chartInstance.current.setOption({
      tooltip: {
        trigger: 'item',
        formatter: () =>
          diagnosis.mastery
            .map((item) => `${item.name}: ${percent(item.masteryProbability)}`)
            .join('<br/>'),
      },
      radar: {
        radius: '68%',
        center: ['50%', '54%'],
        indicator: diagnosis.mastery.map((item) => ({ name: item.name, max: 1 })),
        axisName: { color: '#475569', fontSize: 12 },
        splitLine: { lineStyle: { color: '#d6dee8' } },
        axisLine: { lineStyle: { color: '#d6dee8' } },
        splitArea: { areaStyle: { color: ['#ffffff', '#f8fafc'] } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: diagnosis.mastery.map((item) => item.masteryProbability),
              name: '掌握率',
              areaStyle: { color: 'rgba(14, 165, 166, 0.22)' },
              lineStyle: { color: '#0ea5a6', width: 2 },
              itemStyle: { color: '#0ea5a6' },
            },
          ],
        },
      ],
    });
    const resize = () => chartInstance.current?.resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [diagnosis]);

  return <div ref={chartRef} className={styles.chart} />;
}

function LoginView({ onLogin }: { onLogin: (session: Session) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('teacher01');
  const [password, setPassword] = useState('password123');
  const [studentNo, setStudentNo] = useState('S001');
  const [state, setState] = useState<LoadingState>('idle');
  const [message, setMessage] = useState('');
  const [registration, setRegistration] = useState<StudentRegistrationResult | null>(null);

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    setState('loading');
    setMessage('');
    try {
      const result = await login(username, password);
      setState('success');
      onLogin(result);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : '登录失败');
    }
  }

  async function submitRegister(event: React.FormEvent) {
    event.preventDefault();
    setState('loading');
    setMessage('');
    setRegistration(null);
    try {
      const result = await registerStudent({ username, password, studentNo });
      setRegistration(result);
      setState('success');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : '注册失败');
    }
  }

  return (
    <main className={styles.loginShell}>
      <section className={styles.loginPanel}>
        <div className={styles.brandBlock}>
          <span>AI Education MVP</span>
          <h1>智能化认知诊断平台</h1>
          <p>教师上传固定模板成绩，系统完成校验、DINA 诊断和可视化；学生注册后需经教师审核，才能查看自己的成绩与学习建议。</p>
        </div>

        <form className={styles.loginForm} onSubmit={mode === 'login' ? submitLogin : submitRegister}>
          <div className={styles.segmented}>
            <button type="button" className={mode === 'login' ? styles.activeSegment : ''} onClick={() => setMode('login')}>
              登录
            </button>
            <button type="button" className={mode === 'register' ? styles.activeSegment : ''} onClick={() => setMode('register')}>
              学生注册
            </button>
          </div>
          <label>
            账号
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            密码
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {mode === 'register' && (
            <label>
              学号
              <input value={studentNo} onChange={(event) => setStudentNo(event.target.value)} />
            </label>
          )}
          {mode === 'login' && (
            <div className={styles.quickLogins}>
              <button type="button" onClick={() => setUsername('teacher01')}>
                教师
              </button>
              <button type="button" onClick={() => setUsername('stu001')}>
                学生
              </button>
            </div>
          )}
          <button className={styles.primaryButton} type="submit" disabled={state === 'loading'}>
            {state === 'loading' ? '处理中...' : mode === 'login' ? '登录' : '提交注册'}
          </button>
          {registration && (
            <p className={styles.formSuccess}>
              {registration.message} 当前学号 {registration.binding.studentNo} 为{statusText(registration.binding.status)}状态。
            </p>
          )}
          {message && <p className={styles.formError}>{message}</p>}
        </form>
      </section>
    </main>
  );
}

function AppHeader({ session, onLogout }: { session: Session; onLogout: () => void }) {
  return (
    <header className={styles.appHeader}>
      <div>
        <span>{session.user.role === 'teacher' ? 'Teacher Portal' : 'Student Portal'}</span>
        <h1>智能化认知诊断平台</h1>
      </div>
      <div className={styles.userBox}>
        <strong>{session.user.displayName}</strong>
        <span className={styles.statusPill}>{session.user.role === 'student' ? statusText(session.user.status) : '教师'}</span>
        <button type="button" onClick={onLogout}>
          退出
        </button>
      </div>
    </header>
  );
}

function StudentApprovalPanel({ session }: { session: Session }) {
  const [approvals, setApprovals] = useState<StudentApproval[]>([]);
  const [state, setState] = useState<LoadingState>('idle');
  const [message, setMessage] = useState('');

  async function loadApprovals() {
    setState('loading');
    setMessage('');
    try {
      const rows = await fetchStudentApprovals(session.token);
      setApprovals(rows);
      setState('success');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : '待审核学生加载失败');
    }
  }

  useEffect(() => {
    void loadApprovals();
  }, [session.token]);

  async function review(studentId: number, action: 'approve' | 'reject') {
    setMessage('');
    try {
      const result =
        action === 'approve'
          ? await approveStudent(session.token, studentId)
          : await rejectStudent(session.token, studentId);
      setMessage(result.message);
      await loadApprovals();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '审核操作失败');
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.previewHeader}>
        <div className={styles.panelTitle}>
          <span>Student Review</span>
          <h2>学生注册审核</h2>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={loadApprovals} disabled={state === 'loading'}>
          刷新
        </button>
      </div>
      {approvals.length === 0 ? (
        <p className={styles.mutedText}>暂无待审核学生。</p>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>账号</th>
                <th>学号</th>
                <th>姓名</th>
                <th>班级</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((item) => (
                <tr key={item.userId}>
                  <td>{item.username}</td>
                  <td>{item.studentNo}</td>
                  <td>{item.studentName}</td>
                  <td>{item.className}</td>
                  <td>{statusText(item.status)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button type="button" onClick={() => review(item.studentId, 'approve')}>
                        通过
                      </button>
                      <button type="button" onClick={() => review(item.studentId, 'reject')}>
                        拒绝
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {message && <p className={message.includes('失败') ? styles.formError : styles.formSuccess}>{message}</p>}
    </section>
  );
}

function TeacherDashboard({ session }: { session: Session }) {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(1);
  const [examName, setExamName] = useState('DINA Diagnostic Quiz');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmImportResult | null>(null);
  const [state, setState] = useState<LoadingState>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchTeacherClasses(session.token)
      .then((rows) => {
        setClasses(rows);
        if (rows[0]) setSelectedClassId(rows[0].id);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : '班级加载失败'));
  }, [session.token]);

  async function submitPreview(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setMessage('请选择 .xlsx 文件');
      return;
    }
    setState('loading');
    setMessage('');
    setConfirmResult(null);
    try {
      const result = await previewUpload(session.token, { classId: selectedClassId, examName, file });
      setPreview(result);
      setState('success');
    } catch (error) {
      setState('error');
      setPreview(null);
      setMessage(error instanceof Error ? error.message : '上传预览失败');
    }
  }

  async function confirm() {
    if (!preview) return;
    setState('loading');
    setMessage('');
    try {
      const result = await confirmUpload(session.token, preview.uploadId);
      setConfirmResult(result);
      setState('success');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : '确认入库失败');
    }
  }

  return (
    <main className={styles.workspace}>
      <section className={styles.metrics}>
        <div>
          <span>班级数</span>
          <strong>{classes.length}</strong>
        </div>
        <div>
          <span>当前班级学生</span>
          <strong>{classes.find((item) => item.id === selectedClassId)?.studentCount ?? 0}</strong>
        </div>
        <div>
          <span>模板题数</span>
          <strong>20</strong>
        </div>
      </section>

      <StudentApprovalPanel session={session} />

      <section className={styles.twoColumn}>
        <form className={styles.panel} onSubmit={submitPreview}>
          <div className={styles.panelTitle}>
            <span>Excel Upload</span>
            <h2>上传固定模板成绩</h2>
          </div>
          <label>
            班级
            <select value={selectedClassId} onChange={(event) => setSelectedClassId(Number(event.target.value))}>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            考试名称
            <input value={examName} onChange={(event) => setExamName(event.target.value)} />
          </label>
          <label>
            成绩文件
            <input type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <button className={styles.primaryButton} type="submit" disabled={state === 'loading'}>
            {state === 'loading' ? '处理中...' : '预览并校验'}
          </button>
          {message && <p className={styles.formError}>{message}</p>}
        </form>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>
            <span>Template</span>
            <h2>固定模板字段</h2>
          </div>
          <pre className={styles.templateBox}>{sampleCsv()}</pre>
        </div>
      </section>

      {preview && (
        <section className={styles.panel}>
          <div className={styles.previewHeader}>
            <div className={styles.panelTitle}>
              <span>Preview</span>
              <h2>上传预览</h2>
            </div>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={confirm}
              disabled={preview.summary.errorRowCount > 0 || state === 'loading'}
            >
              确认入库
            </button>
          </div>
          <div className={styles.metrics}>
            <div>
              <span>总行数</span>
              <strong>{preview.summary.rowCount}</strong>
            </div>
            <div>
              <span>有效行</span>
              <strong>{preview.summary.validRowCount}</strong>
            </div>
            <div>
              <span>错误行</span>
              <strong>{preview.summary.errorRowCount}</strong>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>行号</th>
                  <th>学号</th>
                  <th>姓名</th>
                  <th>校验</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{row.studentNo}</td>
                    <td>{row.studentName}</td>
                    <td>{row.errors.length === 0 ? '通过' : row.errors.map((error) => `${error.field}: ${error.message}`).join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {confirmResult && (
        <section className={styles.successPanel}>
          已确认入库：{confirmResult.importedResponses} 条作答记录，生成 {confirmResult.diagnosedStudents} 名学生诊断结果。
        </section>
      )}
    </main>
  );
}

function StudentStatusPanel({ status }: { status: StudentStatus }) {
  const title = status.status === 'rejected' ? '注册申请已被拒绝' : '注册申请待审核';
  const body =
    status.status === 'rejected'
      ? '请联系任课老师确认学号信息后重新处理。'
      : '老师审核通过后，你将自动进入成绩与诊断结果页面。';

  return (
    <main className={styles.workspace}>
      <section className={styles.statusPanel}>
        <span className={styles.statusPill}>{statusText(status.status)}</span>
        <h2>{title}</h2>
        <p>{body}</p>
        {status.student && (
          <div className={styles.statusGrid}>
            <div>
              <span>学号</span>
              <strong>{status.student.studentNo}</strong>
            </div>
            <div>
              <span>姓名</span>
              <strong>{status.student.name}</strong>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function StudentDashboard({ session }: { session: Session }) {
  const [studentStatus, setStudentStatus] = useState<StudentStatus | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [selectedExamId, setSelectedExamId] = useState(0);
  const [diagnosis, setDiagnosis] = useState<StudentDiagnosis | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStudentStatus(session.token)
      .then((status) => {
        setStudentStatus(status);
        if (!status.canViewResults) return [];
        return fetchStudentResults(session.token);
      })
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setResults(rows);
        if (rows[0]) setSelectedExamId(rows[0].examId);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : '学生信息加载失败'));
  }, [session.token]);

  useEffect(() => {
    if (!selectedExamId || studentStatus?.status !== 'approved') return;
    fetchStudentDiagnosis(session.token, selectedExamId)
      .then(setDiagnosis)
      .catch((error) => setMessage(error instanceof Error ? error.message : '诊断加载失败'));
  }, [selectedExamId, session.token, studentStatus?.status]);

  const selectedResult = useMemo(
    () => results.find((item) => item.examId === selectedExamId),
    [results, selectedExamId]
  );

  if (studentStatus && studentStatus.status !== 'approved') {
    return <StudentStatusPanel status={studentStatus} />;
  }

  return (
    <main className={styles.workspace}>
      {results.length === 0 && (
        <section className={styles.emptyPanel}>
          暂无诊断结果。请先由教师上传并确认一份固定模板 Excel。
        </section>
      )}

      {results.length > 0 && (
        <>
          <section className={styles.studentTopbar}>
            <label>
              考试
              <select value={selectedExamId} onChange={(event) => setSelectedExamId(Number(event.target.value))}>
                {results.map((item) => (
                  <option key={item.examId} value={item.examId}>
                    {item.examName}
                  </option>
                ))}
              </select>
            </label>
            {selectedResult && (
              <div>
                <span>得分</span>
                <strong>
                  {selectedResult.score}/{selectedResult.total}
                </strong>
              </div>
            )}
          </section>

          {diagnosis && (
            <>
              <section className={styles.twoColumn}>
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>
                    <span>Radar</span>
                    <h2>知识点掌握雷达图</h2>
                  </div>
                  <MasteryRadar diagnosis={diagnosis} />
                </div>
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>
                    <span>Advice</span>
                    <h2>个性化学习建议</h2>
                  </div>
                  <p className={styles.recommendation}>{diagnosis.recommendation}</p>
                  <div className={styles.weakList}>
                    {diagnosis.weakPoints.length === 0 ? (
                      <span>暂无明显薄弱知识点</span>
                    ) : (
                      diagnosis.weakPoints.map((item) => (
                        <div key={item.knowledgePointId}>
                          <strong>{item.name}</strong>
                          <span>{percent(item.masteryProbability)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelTitle}>
                  <span>Mastery</span>
                  <h2>知识点掌握明细</h2>
                </div>
                <div className={styles.masteryList}>
                  {diagnosis.mastery.map((item) => (
                    <div key={item.knowledgePointId}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          证据 {item.evidenceCorrect}/{item.evidenceTotal}
                        </span>
                      </div>
                      <div className={styles.progressTrack}>
                        <span style={{ width: percent(item.masteryProbability) }} />
                      </div>
                      <b>{percent(item.masteryProbability)}</b>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </>
      )}

      {message && <p className={styles.formError}>{message}</p>}
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  if (!session) return <LoginView onLogin={setSession} />;

  return (
    <div className={styles.app}>
      <AppHeader session={session} onLogout={() => setSession(null)} />
      {session.user.role === 'teacher' ? <TeacherDashboard session={session} /> : <StudentDashboard session={session} />}
    </div>
  );
}
