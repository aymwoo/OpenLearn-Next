export type LessonStep = {
  id: string
  title: '导入' | '讲授' | '练习' | '总结'
  duration: string
  focus: string
  description: string
  status: 'done' | 'current' | 'next'
}

export const demoCourse = {
  id: 'course-it-7',
  title: '七年级编程基础',
  subject: '初中信息科技',
  grade: '七年级',
  classLabel: '七年级 3 班',
  teacher: '许老师',
  progressLabel: '本周第 2 课',
}

export const demoLesson = {
  id: 'lesson-scratch-motion',
  title: '编程基础：让角色动起来',
  objective: '理解顺序执行和坐标移动，让学生能设计一个角色运动小任务。',
  duration: '45 分钟',
  mode: '锁定跟随',
  flowLabel: '导入 / 讲授 / 练习 / 总结',
}

export type HomeMetric = {
  value: string
  label: string
}

export const homeMetrics: HomeMetric[] = [
  { value: '10W+', label: '活跃学生' },
  { value: '500+', label: '精品课程' },
  { value: '98%', label: '好评率' },
]

export const recommendedCourses = [
  { title: '编程基础入门', tag: '推荐课程', detail: '用角色运动理解顺序执行' },
  { title: '数字作品表达', tag: '信息科技', detail: '把课堂产出变成可展示作品' },
] as const

export const lessonSteps: LessonStep[] = [
  {
    id: 'warmup',
    title: '导入',
    duration: '5 分钟',
    focus: '问题唤醒',
    description: '观察角色在舞台上移动的现象，说出“位置变化”带来的画面差异。',
    status: 'done',
  },
  {
    id: 'teach',
    title: '讲授',
    duration: '14 分钟',
    focus: '坐标与顺序',
    description: '用 Scratch 角色运动指令说明 x/y 坐标、顺序执行和重复执行。',
    status: 'current',
  },
  {
    id: 'practice',
    title: '练习',
    duration: '18 分钟',
    focus: '任务挑战',
    description: '完成“角色走到目标点并说出提示语”的小任务，记录调试过程。',
    status: 'next',
  },
  {
    id: 'reflect',
    title: '总结',
    duration: '8 分钟',
    focus: '迁移表达',
    description: '用自己的话解释角色移动脚本，并说出一个可以改进的动画效果。',
    status: 'next',
  },
]

export const teacherCards = [
  { title: '今日备课', value: '1 节', detail: '七年级 3 班 信息科技', tone: 'primary' },
  { title: '正在编排', value: '4 个步骤', detail: '导入、讲授、练习、总结', tone: 'neutral' },
  { title: '待进入课堂', value: '14:20', detail: '编程基础：让角色动起来', tone: 'success' },
  { title: '资源准备', value: '3 份', detail: '变量小抄、素材、任务单', tone: 'neutral' },
]

export const studentProgress = {
  name: '林若晴',
  classLabel: '七年级 3 班',
  currentStep: '讲授',
  completedSteps: 1,
  totalSteps: 4,
  status: '已完成导入，正在学习角色坐标。',
}

export const resourceCards = [
  { title: '变量小抄', type: '知识卡', subject: '初中信息科技', usage: '课前 3 分钟快速回顾' },
  { title: 'Scratch 角色运动素材', type: '素材包', subject: '初中信息科技', usage: '练习环节直接使用' },
  { title: '课堂任务单', type: '任务单', subject: '初中信息科技', usage: '记录调试过程与结果' },
]

export const courseCards = [
  { title: '七年级编程基础', subject: '初中信息科技', lessons: '8 个课时', status: '正在建设' },
  { title: '数字作品表达', subject: '初中信息科技', lessons: '6 个课时', status: '可继续完善' },
  { title: '数据与生活', subject: '初中信息科技', lessons: '5 个课时', status: '准备资源' },
]

export const classroomParticipants = [
  { name: '林若晴', status: '已跟随', detail: '导入完成' },
  { name: '陈子墨', status: '进行中', detail: '查看讲授画面' },
  { name: '周以安', status: '需关注', detail: '练习未开始' },
  { name: '何沐阳', status: '已跟随', detail: '等待下一步' },
]

export const rolePreviewItems = [
  { label: '教师', description: '查看备课、编辑和控课路径。' },
  { label: '学生', description: '查看学习空间与课堂播放器。' },
  { label: '课堂', description: '查看锁定跟随和自由浏览状态。' },
  { label: '管理', description: '查看低强调的管理入口外壳。' },
] as const
