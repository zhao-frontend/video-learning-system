// window.onbeforeunload = function () {
//     var message = '要离开答题系统吗？';
//     return message;
// }
dayjs.extend(dayjs_plugin_weekOfYear);
const vue_script = new Vue({
    el: '#container',
    data: {
        seList: [],
        questionList: [],
        collectionList: [],
        mistakes: [],
        mistakes_sets: 0,
        mistakes_collections: 0,
        mistakes_active: 0,
        chosenRange: '',
        mistake_history: [],
        mistake_history_cate: {
            single: 0,
            multi: 0,
            tof: 0
        },
        marked_cate: {
            single: 0,
            multi: 0,
            tof: 0
        },
        active_history_type: '',
        currentQuest: 0,
        item: '',
        chosenAnswer: [],
        refreshKey: 0,
        timer: '',
        time: 0,
        nextTimeout: '',
        userid: '',
        userInfo: {},
        questLoad: false,
        hasData: false,
        isVerified: false,
        mistake_view_mode: 'type',
        favorite_ids_arr: [],
        expanded_kp: {},
        profileForm: {
            name: '',
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        },
        info: {
            mode: 0, //0:题库模式 1: 套卷模式 2: 错题模式
            title: '',
            range: '',
            attempts: 0,
            curAttempt: 0,
            mistake_id: '',
            isDailyPractice: false
        },
        statistic: {
            complete: false,
            total_score: 0,
            correct: 0,
            incorrect: 0,
            time: ''
        },
        logForm: {
            phone: '',
            password: '',
            remember: false
        },
        regForm: {
            phone: '',
            password: '',
            passConf: '',
            name: ''
        },
        markedQuestionList: [],
        questMarked: false,
        quizHistory: [],
        notifications: [],
        unread_count: 0,
        avatar_url: '',
        showAvatarModal: false,
        dailyDone: false,
        dailyHasProgress: false,
        dailyDate: '',
        userStats: {
            total: 0,
            correct: 0,
            papers: 0,
            days: 0
        },
        expanded_history: {},
        expanded_history_quiz: {},
        weakPoints: []
    },
    computed: {
        total_time() {
            return `${parseInt(this.statistic.time / 60) < 10 ? '0' +
                (parseInt(this.statistic.time / 60)) : parseInt(this.statistic.time / 60)}:${this.statistic.time -
                    (60 * parseInt(this.statistic.time / 60)) < 10 ? '0' + (this.statistic.time - (60 *
                        parseInt(this.statistic.time / 60))) : this.statistic.time - (60 *
                            parseInt(this.statistic.time / 60))}`
        },
        filtered_history() {
            if (this.active_history_type) {
                return this.mistake_history.filter(v => v.question_type == this.active_history_type)
            } else {
                return this.mistake_history
            }
        },
        weeked_history() {
            const groupedByWeek = this.filtered_history.reduce((acc, item, index) => {
                const date = dayjs(item.answer_time);
                // Create a unique key for the year and week (e.g., "2024-19")
                const startOfWeek = date.startOf('week').format('YYYY-MM-DD');
                const endOfWeek = date.endOf('week').format('YYYY-MM-DD');
                const weekKey = `${date.year()}年第${date.week()}周 (${startOfWeek}~${endOfWeek})`;
                console.log(index)
                if (!acc[weekKey]) {
                    acc[weekKey] = [];
                    this.expanded_history[weekKey] = false;
                }

                acc[weekKey].push(item);
                return acc;
            }, {});
            console.log(groupedByWeek)
            console.log(this.expanded_history)
            return groupedByWeek;
        },
        filtered_marked() {
            if (this.active_history_type) {
                return this.markedQuestionList.filter(v => v.question_type == this.active_history_type)
            } else {
                return this.markedQuestionList
            }
        },
        weeked_quiz_history() {
            return (this.quizHistory || []).reduce((acc, item) => {
                if (!item.c_time) return acc;
                const date = dayjs(item.c_time);
                const startOfWeek = date.startOf('week').format('YYYY-MM-DD');
                const endOfWeek = date.endOf('week').format('YYYY-MM-DD');
                const weekKey = `${date.year()}年第${date.week()}周 (${startOfWeek}~${endOfWeek})`;
                if (!acc[weekKey]) {
                    acc[weekKey] = [];
                    this.expanded_history_quiz[weekKey] = false;
                }
                acc[weekKey].push(item);
                return acc;
            }, {});
        },
        filtered_mistakes() {
            return (this.mistakes || []).filter(v => v.array_type == this.mistakes_active);
        },
        filtered_favorites() {
            return (this.mistake_history || []).filter(v => this.favorite_ids_arr.includes(parseInt(v.qiestion_id)));
        },
        mistake_history_by_knowledge() {
            let groups = {};
            (this.mistake_history || []).forEach(v => {
                let kps = v.question_knowledgepoints || ['未分类'];
                kps.forEach(kp => {
                    if (!kp) kp = '未分类';
                    if (!groups[kp]) groups[kp] = { name: kp, items: [] };
                    groups[kp].items.push(v);
                });
            });
            return Object.values(groups).sort((a, b) => b.items.length - a.items.length);
        },
        maxKpCount() {
            const list = this.mistake_history_by_knowledge;
            return list.length > 0 ? list[0].items.length : 1;
        },
        filteredCollections() {
            if ((this.userInfo.user_type || 'trial') === 'trial') {
                return (this.collectionList || []).filter(v => v.is_trial == 1 || v.is_trial === '1');
            }
            return this.collectionList || [];
        },
        questionStat() {
            let status = {
                A: 0,
                B: 0,
                C: 0,
                D: 0,
                E: 0
            }
            let key = this.refreshKey;
            //0: 未选中 1:选中 2:正确 -1: 错误 -2: 少选
            let questions = ['A', 'B', 'C', 'D', 'E'];
            let currentQuest = this.currentQuest;
            console.log(this.questionList[currentQuest].question_type)
            questions.forEach(v => {
                if (this.questionList[currentQuest].is_answered === true) {
                    if (this.questionList[currentQuest].is_correct === true) {
                        if (this.chosenAnswer.indexOf(v) >= 0) {
                            status[v] = 2
                        } else {
                            status[v] = 0
                        }
                    } else {
                        if (this.questionList[currentQuest].question_type == '多选') {
                            console.log('multiple')
                            let multiple_answer = this.questionList[currentQuest].answer_correct.split(',');
                            console.log(multiple_answer.indexOf(v))
                            console.log(this.chosenAnswer.indexOf(v))
                            if (multiple_answer.indexOf(v) >= 0 && this.chosenAnswer.indexOf(v) >= 0) {
                                status[v] = 2
                            } else if (multiple_answer.indexOf(v) >= 0 && this.chosenAnswer.indexOf(v) < 0) {
                                status[v] = -2
                            } else if (multiple_answer.indexOf(v) < 0 && this.chosenAnswer.indexOf(v) >= 0) {
                                status[v] = -1
                            } else {
                                status[v] = 0
                            }

                        } else {
                            // console.log(chosenAnswer)
                            if (!this.chosenAnswer) {
                                this.chosenAnswer = []
                            }
                            if (this.questionList[currentQuest].answer_correct.indexOf(v) >= 0) {
                                if (!this.chosenAnswer) {
                                    status[v] = -2
                                } else if (this.chosenAnswer.length == 0) {
                                    status[v] = -2;
                                } else {
                                    status[v] = 2
                                }

                            } else if (this.chosenAnswer.indexOf(v) >= 0) {
                                status[v] = -1
                            } else {
                                status[v] = 0
                            }
                        }

                    }
                } else {
                    if (this.chosenAnswer.indexOf(v) >= 0) {
                        status[v] = 1
                    } else {
                        status[v] = 0
                    }
                }
            })
            console.log(status)
            return status;
        }
    },
    created() {

    },
    mounted() {
        this.getSets();
        this.getCollection();
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'avatarUpdated') {
                this.avatar_url = e.data.pic_url;
                this.showAvatarModal = false;
                this.$message.success('头像已更新');
            }
        });
    },
    methods: {
        async getMarked(){
            let sql = `select * from test_table_learn_quiz_problems where user_id = '${this.userid}' order by Id desc`
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            let data = res.data[0];
            let markedin = ',';
            data.forEach(v => {
                markedin += `${v.question_id},`
            })
            let sql2 = `select * from test_table_learn_question_list where isDel = 0`
            sql2 += " and Id in(-1" + markedin + "-2)";
            let res2 = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql2] },
                { noVerify: true, noAuth: true });
            this.markedQuestionList = res2.data[0];
            this.markedQuestionList.forEach((v, i) => {
                for (let j = 0; j < data.length; j++) {
                    if (data[j].question_id == v.Id){
                        v.createdTime = data[j].createdTime;
                        break;
                    }
                }
            })
            this.markedQuestionList.sort((a, b) => {
                 return b.createdTime.time - a.createdTime.time ;
            })
            console.log(this.markedQuestionList);
            this.marked_cate.single = this.markedQuestionList.filter(v => v.question_type == '单选').length;
            this.marked_cate.multi = this.markedQuestionList.filter(v => v.question_type == '多选').length;
            this.marked_cate.tof = this.markedQuestionList.filter(v => v.question_type == '判断').length;
        },
        markDecide(){
          if (this.questMarked) {
              this.unmarkQuestion();

          }
          else {

              this.markQuestion();
          }
        },
        async markQuestion(){
            let currentQuestion = this.questionList[this.currentQuest];
            console.log(currentQuestion)
            let question_id = currentQuestion.Id;
            let sql = `insert into test_table_learn_quiz_problems (question_id, user_id) values ('${question_id}', '${this.userid}')`;
            let res = await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            if (res.msg.indexOf('成功') >= 0) {
                this.$message.success('问题已成功标注！')
                this.questMarked = true;
            }
        },
        async unmarkQuestion(){
            let currentQuestion = this.questionList[this.currentQuest];
            console.log(currentQuestion)
            let question_id = currentQuestion.Id;
            let sql = `delete from test_table_learn_quiz_problems where question_id = '${question_id}' and user_id = '${this.userid}'`;
            let res = await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            if (res.msg.indexOf('成功') >= 0) {
                this.$message.success('已取消标注问题！')
                this.questMarked = false;
            }
        },
        async queryQuestionMark(){
            let currentQuestion = this.questionList[this.currentQuest];
            console.log(currentQuestion)
            let question_id = currentQuestion.Id;
            let sql = `select * from test_table_learn_quiz_problems where question_id = '${question_id}' and user_id = '${this.userid}'`;
            let res =  await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
             if (res.data[0].length > 0) {
                 this.questMarked = true;
             }
             else{
                 this.questMarked = false;
             }
        },
        async autoLog() {
            let sql = `select * from test_table_learn_users where Id = '${this.userid}' and isDel = 0`;
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            if (res.msg.indexOf('成功') >= 0) {
                if (res.data[0].length > 0) {
                    if (res.data[0][0].user_status == '已通过') {
                        this.userid = res.data[0][0].Id;
                        this.userInfo = {
                            phone: res.data[0][0].user_phone,
                            userid: res.data[0][0].Id,
                            name: res.data[0][0].user_name,
                            user_type: res.data[0][0].user_type || 'trial'
                        }
                        sessionStorage.setItem('user_cache', JSON.stringify(this.userInfo))
                        switchPage('home')
                        this.getUserStats();
                        this.getUnreadCount();
                        this.getDailyStatus();
                        this.getUserAvatar();
                        this.getWeakPoints();
                    } else {
                        this.$message.error('当前账号已被禁止登录')
                        switchPage('login')
                    }
                } else {
                    this.$message.error('登录失败！')
                    switchPage('login')
                }
            } else {
                this.$message.error('登录失败！')
                switchPage('login')
            }
        },
        showRemark(item) {
            this.$alert(item.rquestion_emark && item.rquestion_emark != '无' ? item.rquestion_emark : '本题暂无解析')
        },
        showRemarkMarked(item) {
            this.$alert(item.question_remark && item.question_remark != '无' ? item.question_remark : '本题暂无解析')
        },
        async getMistakeHistory() {
            let sql = `select * from test_table_learn_answer_record where user_id = ${this.userid} and answer_status = 1 and isDel = 0 order by answer_time desc`
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            this.mistake_history = res.data[0] || [];
            this.mistake_history_cate.single = this.mistake_history.filter(v => v.question_type == '单选').length;
            this.mistake_history_cate.multi = this.mistake_history.filter(v => v.question_type == '多选').length;
            this.mistake_history_cate.tof = this.mistake_history.filter(v => v.question_type == '判断').length;
            this.enrichKnowledgePoints();
            await this.getFavorites();
        },
        async enrichKnowledgePoints() {
            if (!this.mistake_history.length) return;
            let ids = [...new Set(this.mistake_history.map(v => v.qiestion_id).filter(Boolean))].join(',');
            if (!ids) return;
            try {
                let sql = `select * from test_table_learn_question_list where Id in (${ids})`;
                let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                    { noVerify: true, noAuth: true });
                if (!res.data || !res.data[0]) return;
                let kpMap = {};

                res.data[0].forEach(v => {
                    let kps = (v.knowledge_point || '').split(/[,，]/).map(s => s.trim()).filter(Boolean);
                    kpMap[v.Id] = kps.length > 0 ? kps : ['未分类'];
                });

                this.mistake_history = this.mistake_history.map(v => ({
                    ...v,
                    question_knowledgepoints: kpMap[v.qiestion_id] || ['未分类']
                }));
            } catch (e) {}
        },
        async doProgress(action) {
            if (action == 'save') {
                let sql = `update test_table_learn_quiz_attempt set used_time = ${this.time} where Id = ${this.info.curAttempt};`
                let res = await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] },
                    { noVerify: true, noAuth: true });
            }
            if (action == 'read') {
                let sql = `select * from test_table_learn_quiz_attempt where user_id = ${this.userid} and set_title = '${this.info.title}' and attempt_status = 0 and isDel = 0 order by attempt_time desc limit 1`
                let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                    { noVerify: true, noAuth: true });
                if (res.data[0].length > 0) {
                    this.hasData = true;
                    this.info.curAttempt = res.data[0][0].Id
                } else {
                    this.hasData = false;
                }
            }
            if (action == 'load') {
                let sql = `select * from test_table_learn_answer_record where user_id = ${this.userid} and attempt_id = ${this.info.curAttempt}`;
                let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                    { noVerify: true, noAuth: true });
                let data = res.data[0];
                console.log(data)
                let lastindex = -1;
                console.log(this.questionList)
                this.questionList.forEach((v, index) => {
                    // console.log(v)
                    for (let i = 0; i < data.length; i++) {
                        console.log(v.Id, data[i].qiestion_id)
                        if (data[i].qiestion_id == v.Id) {
                            lastindex = index;
                            console.log(index)
                            v.is_answered = data[i].is_answered == 1 ? true : false;
                            v.answer_chosen = data[i].answer_user.split(",")
                            v.is_correct = data[i].answer_status == 0 ? true : false;
                            break
                        }
                    }
                })
                this.chosenAnswer = [];
                if (lastindex == -1) {
                    this.currentQuest = 0;
                } else {
                    this.currentQuest = lastindex + 1;
                }
                this.queryQuestionMark();
                // console.log(this.questionList)
            }
            if (action == 'remove') {
                let p_sql = `update test_table_learn_quiz_attempt set attempt_status = 1 where user_id = '${this.userid}' and set_title = '${this.info.title}'`
                let res = await request.post('mysql/updateInfo.jsp', { "sqlstring": [p_sql] },
                    { noVerify: true, noAuth: true });
            }

        },
        doLogOut() {
            this.$confirm(`确定要登出吗？`, {
                distinguishCancelAndClose: true,
                confirmButtonText: '是',
                cancelButtonText: '否',
                type: 'warning'
            }).then(res => {
                switchPage('login')
                this.userInfo = {};
                this.userid = 0;
                this.avatar_url = '';
                sessionStorage.removeItem('user_cache');
                this.$message.success('已登出！')
            }).catch(res => {
            })

        },

        async doLogin() {
            if (!this.logForm.phone) {
                this.$message.error('请输入手机号！');
                return false;
            }
            if (!this.logForm.password) {
                this.$message.error('请输入密码！');
                return false;
            }
            let passmd5 = md5(this.logForm.password);
            let sql = `select * from test_table_learn_users where user_phone = '${this.logForm.phone}'  and password_md5 = '${passmd5}' and isDel = 0`;
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            if (res.msg.indexOf('成功') >= 0) {
                if (res.data[0].length > 0) {
                    if (res.data[0][0].user_status == '已通过') {
                        this.$message.success('登录成功！')
                        this.userid = res.data[0][0].Id;
                        this.userInfo = {
                            phone: res.data[0][0].user_phone,
                            userid: res.data[0][0].Id,
                            name: res.data[0][0].user_name,
                            user_type: res.data[0][0].user_type || 'trial'
                        }
                        sessionStorage.setItem('user_cache', JSON.stringify(this.userInfo))
                        switchPage('home')
                        this.getUserStats();
                        this.getUnreadCount();
                        this.getDailyStatus();
                        this.getUserAvatar();
                        this.getWeakPoints();
                    } else if (res.data[0][0].user_status == '审核中' || res.data[0][0].user_status === '') {
                        this.$message.error('账号审核中')
                    } else {
                        this.$message.error('当前账号已被禁止登录')
                    }
                } else {
                    this.$message.error('用户名或密码错误！')
                }
            } else {
                this.$message.error('登录失败！')
            }
        },
        async doRegister() {

            let phonereg = /^(?:\+?86)?1(?:3\d{3}|5[^4\D]\d{2}|8\d{3}|7(?:[235-8]\d{2}|4(?:0\d|1[0-2]|9\d))|9[0-35-9]\d{2}|66\d{2})\d{6}$/i;
            let passreg = /^(?=.*\d)(?=.*[a-zA-Z])[0-9a-zA-Z$&+,:;=?@#|'<>.-^*()%!]{6,20}$/
            if (!phonereg.exec(this.regForm.phone)) {
                this.$message.error('请输入有效的+86手机号！')
                return false;
            }
            if (!this.regForm.password) {
                this.$message.error('请输入密码！')
                return false;
            }
            if (this.regForm.name.trim(" ").length == 0) {
                this.$message.error('请输入姓名！');
                return false;
            }
            if (this.regForm.name.trim(" ").length < 2) {
                this.$message.error('姓名不得小于2字符！');
                return false;
            }
            if (!passreg.exec(this.regForm.password)) {
                this.$message.error('密码不符合要求！！')
                return false;
            }
            if (this.regForm.password != this.regForm.passConf) {
                this.$message.error('两次密码输入不一致！');
                return false;
            }
            window.xsukaxCAPTCHA.doVerify('captcha');
            const captchaVerified = window.xsukaxCAPTCHA.isVerified('captcha');
            if (!captchaVerified) {
                this.$message.error('验证码未通过！请在输入验证码以后点击验证')
                return false;
            }
            let dupsql = `select * from test_table_learn_users where user_phone = '${this.regForm.phone}' and isDel = 0`;
            let preres = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [dupsql] },
                { noVerify: true, noAuth: true });
            if (preres.data[0].length > 0) {
                this.$message.error('该手机号已被使用！')
                return false;
            }
            let passmd5 = md5(this.regForm.password)
            let sql = `insert into test_table_learn_users (user_phone, password_md5, user_name, user_status) values ('${this.regForm.phone}', '${passmd5}', '${this.regForm.name}', '审核中')`;
            let res = await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            if (res.msg.indexOf('成功') >= 0) {
                this.$alert(`注册成功！请等待后台审核账号`, {
                    confirmButtonText: '是',
                    type: 'success'
                }).then(() => {
                    this.$message.success('注册成功！')
                    switchPage('login')
                })

            } else {
                this.$message.error(res.msg)
            }
        },
        async querymistakes() {
            let sql = `select * from test_table_learn_mistake_record where isDel = 0 and user_id = ${this.userid} and (final_score is null or final_score <> '100') and (mistake_progress is null or mistake_progress <> '100') order by c_time desc`;
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            this.mistakes = res.data[0] || [];
            if (this.mistakes.length === 0) {
                let sql2 = `select distinct qiestion_id from test_table_learn_answer_record where user_id = ${this.userid} and answer_status = 1 and isDel = 0`;
                let res2 = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql2] },
                    { noVerify: true, noAuth: true });
                let ids = (res2.data[0] || []).map(v => v.qiestion_id).filter(Boolean);
                if (ids.length > 0) {
                    this.mistakes = [{
                        Id: '_auto',
                        array_type: '0',
                        array_name: '综合错题',
                        final_score: '0',
                        mistake_list: ids.join(','),
                        mistake_progress: '0',
                        c_time: '',
                        spent_time: ''
                    }];
                }
            }
            this.mistakes_sets = this.mistakes.filter(v => v.array_type == 0).length;
            this.mistakes_collections = this.mistakes.filter(v => v.array_type == 1).length;
        },
        closeQuest() {
            let is_save = this.info.mode == 0;
            this.$confirm(`你确定要立刻结束此次答题吗？\n${is_save ? '您的进度将会保存。' : '您的进度将会丢失！'}`, {
                distinguishCancelAndClose: true,
                confirmButtonText: '是',
                cancelButtonText: '否',
                type: 'warning'
            }).then(() => {

                if (is_save) {
                    this.questionList[this.currentQuest].answer_chosen = this.chosenAnswer;
                    this.doProgress('save');
                }

                clearInterval(this.timer);
                switchPage('home');
            }).catch(res => {
            })

        },
        async getCollection() {
            let sql = `select * from test_table_learn_question_collection where isDel = 0`
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            this.collectionList = res.data[0];
        },
        toChosenQuestion(item, index) {
            this.currentQuest = index;
            this.queryQuestionMark();
            this.chosenAnswer = item.answer_chosen;

            switchPage('quiz')
        },
        retryQuest() {
            this.$confirm(`确定要重试吗？`, {
                distinguishCancelAndClose: true,
                confirmButtonText: '是',
                cancelButtonText: '否',
                type: 'warning'
            }).then(() => {
                if (this.info.mode == 0) {
                    if (this.info.isDailyPractice) {
                        this.toDailyPractice();
                    } else {
                        this.updateAttempts();
                        this.toQuiz(this.info.title);
                    }
                } else if (this.info.mode == 1) {
                    this.toCollection(this.info.range);
                } else if (this.info.mode == 2) {
                    this.toMistake(this.info.range)
                }
            }).catch(res => {
            })


        },
        async getSets() {
            let sql = 'select * from test_table_learn_subjects where isDel = 0'
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            console.log(res)
            this.seList = res.data[0];
        },
        toMistakeBefore(item){
            this.info.mistake_id = item.Id;
            this.toMistake(item.mistake_list);
        },
        toMistake(range) {
            this.questLoad = true;
            this.info.range = range;
            this.info.mode = 2;
            const pages = document.querySelectorAll('.page');
            pages.forEach(p => p.classList.remove('active'));
            this.currentQuest = 0;
            this.getQuiz(false, true, `,${this.info.range},`)
            // 显示目标页面
            const targetPage = document.getElementById('page-quiz');
            if (targetPage) {
                targetPage.classList.add('active');
                // 滚动到顶部
                document.getElementById('main-screen').scrollTop = 0;
            }
            // 更新导航栏状态
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.classList.remove('active');
            });

            // 隐藏/显示底部导航（某些特定页面如答题页需要隐藏）
            const bottomNav = document.getElementById('bottom-nav');

            bottomNav.style.display = 'none';
        },
        toCollection(id) {
            if (!id) {
                this.$alert('您尚未选择套卷', { confirmButtonText: '确定' });
                return false;
            }
            this.questLoad = true;
            let item = this.collectionList.find(v => v.Id = id);
            console.log(item)
            this.info.mode = 1;
            this.info.range = item.question_ids;
            this.info.title = item.collection_fullname;
            const pages = document.querySelectorAll('.page');
            pages.forEach(p => p.classList.remove('active'));
            this.currentQuest = 0;
            this.getQuiz(false, true, this.info.range)
            // 显示目标页面
            const targetPage = document.getElementById('page-quiz');
            if (targetPage) {
                targetPage.classList.add('active');
                // 滚动到顶部
                document.getElementById('main-screen').scrollTop = 0;
            }
            // 更新导航栏状态
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.classList.remove('active');
            });

            // 隐藏/显示底部导航（某些特定页面如答题页需要隐藏）
            const bottomNav = document.getElementById('bottom-nav');

            bottomNav.style.display = 'none';
            // sql = `select * from test_table_learn_question_collection where id in(-1${this.info.range}-2)`;

        },
        async recordQuest() {
            if (this.info.mode == 2) {
                return false;
            }
            let mistakes = [];
            this.questionList.forEach(v => {
                console.log(v)
                if (!v.is_correct) {
                    // console.log('isfalse')
                    mistakes.push(v.Id)
                }
            })
            console.log(mistakes)
            let mistakes_str = mistakes.join(',');
            let date = new Date();
            let datetime = `${date.getFullYear()}-${(date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1}-${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()} ${date.getHours() < 10 ? '0' + date.getHours() : date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}:${date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()}`;
            let spent_time = `${parseInt(this.statistic.time / 60) < 10 ? '0' + (parseInt(this.statistic.time / 60)) : parseInt(this.statistic.time / 60)}:${this.statistic.time - (60 * parseInt(this.statistic.time / 60)) < 10 ? '0' + (this.statistic.time - (60 * parseInt(this.statistic.time / 60))) : this.statistic.time - (60 * parseInt(this.statistic.time / 60))}`
            sql = `insert into test_table_learn_mistake_record (user_id, array_type, array_name, final_score, mistake_list, mistake_corrected, mistake_progress, c_time, spent_time) values ('${this.userid}', '${this.info.mode}', '${this.info.title}', '${this.statistic.total_score}', '${mistakes_str}', '', '0', '${datetime}', '${spent_time}')`
            let res = await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            let is_save = this.info.mode == 0;
            if (is_save) {
                this.doProgress('remove')
            }

        },
        async recordQuestion(item = {}) {
            let currentQuestion = this.questionList[this.currentQuest];
            if (item.Id) {
                currentQuestion = item;
            }
            console.log(currentQuestion)
            let question_id = currentQuestion.Id;
            let title = currentQuestion.question_title;
            let answer_correct = currentQuestion.answer_correct;
            let answer_chosen = currentQuestion.answer_chosen || [];
            let is_correct = currentQuestion.is_correct ? '0' : '1';
            let is_answered = currentQuestion.is_answered ? '1' : '0'
            let remark = currentQuestion.question_remark;
            let question_type = currentQuestion.question_type;
            let date = new Date();
            let datetime = `${date.getFullYear()}-${(date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1}-${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()} ${date.getHours() < 10 ? '0' + date.getHours() : date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}:${date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()}`;
            sql = `insert into test_table_learn_answer_record (qiestion_id, question_type, user_id, question_name, answer_user, answer_correct, answer_status, answer_time, rquestion_emark, is_answered, attempt_id) values ('${question_id}', '${question_type}', '${this.userid}', '${title}', '${answer_chosen}', '${answer_correct}', '${is_correct}', '${datetime}', '${remark}', '${is_answered}', '${this.info.curAttempt}')`
            let res = await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            let is_save = this.info.mode == 0;
            if (is_save) {
                this.doProgress('save')
            }

        },
        submitQuest() {
            let unanswered = 0;
            let correct = 0;
            let incorrect = 0;
            let continue_submit = false
            this.questionList.forEach(v => {
                if (!v.is_answered) {
                    unanswered += 1;
                }
                if (!v.is_correct) {
                    incorrect += 1;
                } else {
                    correct += 1;
                }
            })
            if (unanswered > 0) {
                this.$alert(`您还有${unanswered}个问题未回答,\n请仔细检查试卷!`, { type: 'warning' })


                // if (!continue_submit) {
                //     return false;
                // }
            } else {
                this.$confirm(`确定要交卷吗？`, {
                    distinguishCancelAndClose: true,
                    confirmButtonText: '是',
                    cancelButtonText: '否',
                    type: 'warning'
                }).then(res => {
                    this.questionList.forEach(v => {
                        let prepareRecord = false;
                        if (!v.is_answered) {
                            v.is_answered = true;
                            prepareRecord = true;
                        }
                        if (!v.is_correct) {
                            let q_correct = 0;
                            let answerList = v.answer_correct.split(",");
                            let chosenAnswer = v.answer_chosen || [];
                            c_missed = false;
                            c_isCorrect = false;
                            chosenAnswer.forEach(w => {
                                if (answerList.indexOf(w) >= 0) {
                                    q_correct += 1
                                } else {
                                    c_isCorrect = false;
                                }
                            })
                            if (v.question_type != '多选') {
                                c_missed = false;
                            } else if (q_correct < answerList.length && chosenAnswer.length > 0) {
                                c_missed = true;
                            } else {
                                c_isCorrect = false
                            }
                            if (q_correct == answerList.length && chosenAnswer.length == answerList.length) {
                                c_isCorrect = true;
                            }
                            v.is_correct = c_isCorrect === true && c_missed === false;

                        }
                        if (prepareRecord && this.info.mode != 2) {
                            this.recordQuestion(v);
                        }
                    })
                    clearInterval(this.timer);
                    this.statistic = {
                        complete: true,
                        total_score: 100 * (correct / (this.questionList.length || 1)),
                        correct: correct,
                        incorrect: incorrect,
                        time: this.time
                    }
                    this.finishAttempts();
                    this.recordQuest();
                    if (this.info.mode == 2 && this.statistic.incorrect == 0){
                        this.mistakeFinish()
                    }
                    switchPage('result');
                }).catch(res => {

                })
            }
        },
        async mistakeFinish(){
            if (String(this.info.mistake_id).startsWith('_auto')) return;
            let sql = `update test_table_learn_mistake_record set mistake_progress = '100' where Id = ${this.info.mistake_id}`;
            let res = await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
        },
        async finishAttempts() {
            if (this.info.mode == 2) {
                return false;
            }
            let p_sql = `update test_table_learn_quiz_attempt set attempt_status = 1 where user_id = '${this.userid}' and set_title = '${this.info.title}'`
            let res = await request.post('mysql/updateInfo.jsp', { "sqlstring": [p_sql] },
                { noVerify: true, noAuth: true });
        },
        async queryAttempts(title) {
            let sql = `select * from test_table_learn_quiz_attempt where user_id = ${this.userid} and set_title = '${title}'`;
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            this.info.attempts = res.data[0].length;
        },
        async updateAttempts() {
            let p_sql = `update test_table_learn_quiz_attempt set attempt_status = 1 where user_id = '${this.userid}' and set_title = '${this.info.title}'`
            let date = new Date();
            let datetime = `${date.getFullYear()}-${(date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1}-${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()} ${date.getHours() < 10 ? '0' + date.getHours() : date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}:${date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()}`;
            let sql = `insert into test_table_learn_quiz_attempt (user_id, set_title, attempt_time, attempt_status) values ('${this.userid}', '${this.info.title}', '${datetime}', 0)`
            let res = await request.post('mysql/updateInfo.jsp', { "sqlstring": [p_sql, sql] },
                { noVerify: true, noAuth: true });
            let q_sql = `select Id from test_table_learn_quiz_attempt where user_id = ${this.userid} and attempt_status = 0 order by Id desc limit 1`;
            let res1 = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [q_sql] },
                { noVerify: true, noAuth: true });
            this.info.curAttempt = res1.data[0][0].Id
        },
        toQuiz(title) {
            this.queryAttempts(title);
            this.questLoad = true;
            console.log(title);
            this.info.mode = 0;
            this.info.title = title;
            this.info.range = '';
            const pages = document.querySelectorAll('.page');
            pages.forEach(p => p.classList.remove('active'));
            this.currentQuest = 0;
            this.doProgress('read');
            this.getQuiz(title, false)
            // 显示目标页面
            const targetPage = document.getElementById('page-quizready');
            if (targetPage) {
                targetPage.classList.add('active');
                // 滚动到顶部
                document.getElementById('main-screen').scrollTop = 0;
            }
            // 更新导航栏状态
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.classList.remove('active');
            });

            // 隐藏/显示底部导航（某些特定页面如答题页需要隐藏）
            // const bottomNav = document.getElementById('bottom-nav');

            // bottomNav.style.display = 'none';
        },
        async loadQuizData() {
            await this.doProgress('load');
            this.statistic = {
                complete: false,
                total_score: '',
                correct: '',
                incorrect: '',
            }
            clearInterval(this.timer);
            switchPage('quiz');
            this.timer = setInterval(() => this.time++, 1000)
        },
        getQuizReady() {
            if (this.hasData) {
                this.$confirm(`开始新的答题将会重置当前的答题记录，是否继续？`, {
                    distinguishCancelAndClose: true,
                    confirmButtonText: '是',
                    cancelButtonText: '否',
                    type: 'warning'
                }).then(() => {
                    this.updateAttempts();
                    this.currentQuest = 0;
                    this.chosenAnswer = [];
                    this.statistic = {
                        complete: false,
                        total_score: '',
                        correct: '',
                        incorrect: '',
                    }
                    clearInterval(this.timer);
                    this.time = 0;
                    switchPage('quiz');
                    this.timer = setInterval(() => this.time++, 1000)
                }).catch(() => {
                    // this.info.curAttempt = 0;
                })
            } else {
                this.updateAttempts();
                this.currentQuest = 0;
                this.chosenAnswer = [];
                this.statistic = {
                    complete: false,
                    total_score: '',
                    correct: '',
                    incorrect: '',
                }
                clearInterval(this.timer);
                this.time = 0;
                switchPage('quiz');
                this.timer = setInterval(() => this.time++, 1000)
            }


        },
        async getQuiz(title = '', isBegin, range = '') {
            console.log(this.info)
            let sql = `select * from test_table_learn_question_list where isDel = 0`
            if (title) {
                sql += ` and subject_id='${title}'`
            } else if (range) {
                sql += " and Id in(-1" + range + "-2)"
            }
            console.log(sql)
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            this.questionList = res.data[0];
            console.log(this.questionList)
            if (this.questionList.length == 0) {
                this.$alert("题库内没有问题，请联系工作人员处理", { confirmButtonText: '确定' })
                this.questLoad = false;
                switchPage('home');
                return false;
            }
            if (isBegin) {
                this.currentQuest = 0;
                this.chosenAnswer = [];
                this.statistic = {
                    complete: false,
                    total_score: '',
                    correct: '',
                    incorrect: '',
                }
                clearInterval(this.timer);
                this.time = 0;
                this.timer = setInterval(() => this.time++, 1000)

                // setQuestion();
                // updateStatus();
            }
            this.questLoad = false;
        },
        selectAnswer(answer) {
            if (this.questionList[this.currentQuest].is_answered) {
                return false;
            }
            // $(`.${answer.toLowerCase()}-mark`).removeClass('bg-slate-50')
            if (this.questionList[this.currentQuest].question_type == '多选') {
                if (this.chosenAnswer.indexOf(answer) < 0) {
                    this.chosenAnswer.push(answer)
                } else {
                    let removeindex = this.chosenAnswer.indexOf(answer)
                    this.chosenAnswer.splice(removeindex, 1)
                }
                // $(`.${answer.toLowerCase()}-mark`).addClass('bg-blue-600').removeClass('bg-slate-50').removeClass('text-slate-600').addClass('text-slate-50')
            } else {
                this.chosenAnswer = [answer];
                this.checkAnswer();
            }

        },
        checkAnswer() {
            let answerList = this.questionList[this.currentQuest].answer_correct.split(",");
            let isCorrect = true;
            let missed = false;
            let correct = 0;
            this.chosenAnswer.forEach(v => {
                if (answerList.indexOf(v) >= 0) {
                    correct += 1
                } else {
                    isCorrect = false;
                }
            })
            console.log(correct)
            if (this.questionList[this.currentQuest].question_type != '多选') {
                missed = false;
            } else if (correct < answerList.length && this.chosenAnswer.length > 0) {
                missed = true;
            } else {
                isCorrect = false
            }
            if (correct == answerList.length && this.chosenAnswer.length == answerList.length) {
                isCorrect = true;
            }
            if (isCorrect) {
                console.log('回答正确')
            } else if (missed) {
                console.log('漏选')
            } else {
                console.log('回答错误')
            }
            this.recordResult((missed === false && isCorrect === true));
            // if ((missed === false && isCorrect === true)) {
            //     this.nextTimeout = setTimeout(() => {
            //         if (this.currentQuest + 1 == this.questionList.length) {
            //             return false;
            //         }
            //         this.nextQuestion()
            //     }, 1000)
            // }
        },
        recordResult(status) {
            console.log('answer_status: ', status ? 0 : 1);
            let prepareRecord = false;
            this.questionList[this.currentQuest].answer_chosen = this.chosenAnswer;
            if (!this.questionList[this.currentQuest].is_answered) {
                prepareRecord = true;
            }
            this.questionList[this.currentQuest].is_answered = true;
            this.questionList[this.currentQuest].is_correct = status;
            console.log(this.questionList[this.currentQuest]);
            this.$forceUpdate();
            this.refreshKey++;
            if (prepareRecord && this.info.mode !== 2) {
                this.recordQuestion()
            }
            if (this.info.mode === 2 && status === true && prepareRecord) {
                this.$confirm('答对了！是否将此题从错题本中移除？', {
                    distinguishCancelAndClose: true,
                    confirmButtonText: '移除',
                    cancelButtonText: '保留',
                    type: 'success'
                }).then(() => {
                    this.removeFromMistake();
                }).catch(() => {});
            }
        },
        nextQuestion() {
            this.questionList[this.currentQuest].answer_chosen = this.chosenAnswer;
            if (this.currentQuest + 1 == this.questionList.length) {
                alert('已是最后一题！')
                return false;
            }
            this.currentQuest += 1;
            this.queryQuestionMark();
            if (this.questionList[this.currentQuest].is_answered) {
                this.chosenAnswer = this.questionList[this.currentQuest].answer_chosen;
                this.recordResult(this.questionList[this.currentQuest].is_correct);
            } else {
                this.chosenAnswer = this.questionList[this.currentQuest].answer_chosen || [];
            }
            console.log(this.questionList[this.currentQuest]);
            // clearTimeout(this.nextTimeout)
            this.refreshKey += 1
        },
        prevQuestion() {
            this.questionList[this.currentQuest].answer_chosen = this.chosenAnswer;
            if (this.currentQuest == 0) {
                alert('已是第一题！')
                return false;
            }
            this.currentQuest -= 1;
            this.queryQuestionMark();
            if (this.questionList[this.currentQuest].is_answered) {
                this.chosenAnswer = this.questionList[this.currentQuest].answer_chosen;
                this.recordResult(this.questionList[this.currentQuest].is_correct);
            } else {
                this.chosenAnswer = this.questionList[this.currentQuest].answer_chosen || [];
            }
            console.log(this.questionList[this.currentQuest])
            // clearTimeout(this.nextTimeout)
            this.refreshKey += 1
        },
        selectOption(element, option) {
            // const options = element.parentElement.querySelectorAll('.option-card');
            // options.forEach(opt => opt.classList.remove('selected'));
            // element.classList.add('selected');
            this.selectAnswer(option)
        },
        async getFavorites() {
            if (!this.userid) return;
            try {
                let sql = `SELECT question_id FROM test_table_learn_question_favorite WHERE user_id = ${this.userid} AND isDel = 0`;
                let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                    { noVerify: true, noAuth: true });
                if (res.data && res.data[0]) {
                    this.favorite_ids_arr = res.data[0].map(v => parseInt(v.question_id));
                }
            } catch (e) {}
        },
        isFavorited(qid) {
            return this.favorite_ids_arr.includes(parseInt(qid));
        },
        async toggleFavorite(item) {
            let qid = parseInt(item.qiestion_id);
            let isFav = this.favorite_ids_arr.includes(qid);
            if (isFav) {
                this.favorite_ids_arr = this.favorite_ids_arr.filter(id => id !== qid);
                try {
                    let sql = `UPDATE test_table_learn_question_favorite SET isDel = 1 WHERE user_id = ${this.userid} AND question_id = ${qid} AND isDel = 0`;
                    await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] },
                        { noVerify: true, noAuth: true });
                    this.$message.success('已取消收藏');
                } catch (e) {
                    this.favorite_ids_arr = [...this.favorite_ids_arr, qid];
                    this.$message.error('操作失败，请稍后再试');
                }
            } else {
                this.favorite_ids_arr = [...this.favorite_ids_arr, qid];
                try {
                    let date = new Date();
                    let datetime = `${date.getFullYear()}-${(date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1}-${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()} ${date.getHours() < 10 ? '0' + date.getHours() : date.getHours()}:${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}:${date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()}`;
                    let sql = `INSERT INTO test_table_learn_question_favorite (user_id, question_id, c_time, isDel) VALUES (${this.userid}, ${qid}, '${datetime}', 0)`;
                    await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] },
                        { noVerify: true, noAuth: true });
                    this.$message.success('已收藏');
                } catch (e) {
                    this.favorite_ids_arr = this.favorite_ids_arr.filter(id => id !== qid);
                    this.$message.error('操作失败，请稍后再试');
                }
            }
        },
        toggleHistoryGroup(name){
            this.$set(this.expanded_history, name, !this.expanded_history[name]);
           // this.expanded_history[name] = !this.expanded_history[name];
           console.log(this.expanded_history);
           this.$forceUpdate();
        },
        toggleQuizHistoryGroup(key) {
            this.$set(this.expanded_history_quiz, key, !this.expanded_history_quiz[key]);
            this.$forceUpdate();
        },
        goToKnowledgeView() {
            this.mistake_view_mode = 'knowledge';
            switchPage('mistake-history');
        },
        async getWeakPoints() {
            if (!this.userid) return;
            try {
                let sql1 = `SELECT qiestion_id, COUNT(*) as cnt FROM test_table_learn_answer_record WHERE user_id = ${this.userid} AND answer_status = 1 AND isDel = 0 GROUP BY qiestion_id ORDER BY cnt DESC LIMIT 50`;
                let res1 = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql1] }, { noVerify: true, noAuth: true });
                let rows = res1.data[0] || [];
                if (!rows.length) { this.weakPoints = []; return; }
                let ids = rows.map(r => r.qiestion_id).filter(Boolean).join(',');
                let sql2 = `SELECT Id, knowledge_point FROM test_table_learn_question_list WHERE Id IN (${ids})`;
                let res2 = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql2] }, { noVerify: true, noAuth: true });
                let qRows = res2.data[0] || [];
                let kpMap = {};
                qRows.forEach(q => {
                    let kp = (q.knowledge_point || '').split(/[,，]/)[0].trim();
                    if (kp) kpMap[String(q.Id)] = kp;
                });
                let kpCounts = {};
                rows.forEach(r => {
                    let kp = kpMap[String(r.qiestion_id)];
                    if (!kp) return;
                    kpCounts[kp] = (kpCounts[kp] || 0) + parseInt(r.cnt || 1);
                });
                this.weakPoints = Object.entries(kpCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([name, count]) => ({ name, count }));
            } catch(e) {}
        },
        toggleKpGroup(name) {
            this.$set(this.expanded_kp, name, !this.expanded_kp[name]);
        },
        async updateUserName() {
            let newName = this.profileForm.name.trim();
            if (!newName || newName.length < 2) {
                this.$message.error('姓名不得少于2个字符！');
                return;
            }
            let sql = `UPDATE test_table_learn_users SET user_name = '${newName}' WHERE Id = ${this.userid}`;
            let res = await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            if (res.msg.indexOf('成功') >= 0) {
                this.userInfo.name = newName;
                this.profileForm.name = '';
                this.$message.success('姓名修改成功！');
            } else {
                this.$message.error('修改失败，请稍后再试');
            }
        },
        async changePassword() {
            if (!this.profileForm.oldPassword && !this.profileForm.newPassword && !this.profileForm.confirmPassword) {
                this.$message.success('修改已保存');
                return;
            }
            let passreg = /^(?=.*\d)(?=.*[a-zA-Z])[0-9a-zA-Z$&+,:;=?@#|'<>.-^*()%!]{6,20}$/;
            if (!this.profileForm.oldPassword) {
                this.$message.error('请输入当前密码！');
                return;
            }
            if (!passreg.exec(this.profileForm.newPassword)) {
                this.$message.error('新密码格式错误（字母+数字，6-20位）！');
                return;
            }
            if (this.profileForm.newPassword !== this.profileForm.confirmPassword) {
                this.$message.error('两次密码输入不一致！');
                return;
            }
            let oldMd5 = md5(this.profileForm.oldPassword);
            let checkSql = `SELECT Id FROM test_table_learn_users WHERE Id = ${this.userid} AND password_md5 = '${oldMd5}' AND isDel = 0`;
            let checkRes = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [checkSql] },
                { noVerify: true, noAuth: true });
            if (!checkRes.data[0] || checkRes.data[0].length === 0) {
                this.$message.error('当前密码错误！');
                return;
            }
            let newMd5 = md5(this.profileForm.newPassword);
            let sql = `UPDATE test_table_learn_users SET password_md5 = '${newMd5}' WHERE Id = ${this.userid}`;
            let res = await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            if (res.msg.indexOf('成功') >= 0) {
                this.profileForm.oldPassword = '';
                this.profileForm.newPassword = '';
                this.profileForm.confirmPassword = '';
                this.$message.success('密码修改成功！');
            } else {
                this.$message.error('修改失败，请稍后再试');
            }
        },
        async removeFromMistake() {
            try {
                let currentQuestion = this.questionList[this.currentQuest];
                let qid = String(currentQuestion.Id);
                let ids = this.info.range.split(',').filter(id => id.trim() !== '' && id.trim() !== qid);
                this.info.range = ids.join(',');
                const sqlList = [];
                if (!String(this.info.mistake_id).startsWith('_auto')) {
                    sqlList.push(`UPDATE test_table_learn_mistake_record SET mistake_list = '${ids.join(',')}' WHERE Id = ${this.info.mistake_id}`);
                }
                sqlList.push(`UPDATE test_table_learn_answer_record SET isDel = 1 WHERE user_id = ${this.userid} AND qiestion_id = ${qid} AND answer_status = 1 AND isDel = 0`);
                await request.post('mysql/updateInfo.jsp', { "sqlstring": sqlList }, { noVerify: true, noAuth: true });
                this.$message.success('已从错题本中移除');
            } catch (e) {
                this.$message.error('移除失败，请稍后再试');
            }
        },
        async getQuizHistory() {
            let sql = `SELECT * FROM test_table_learn_mistake_record WHERE isDel = 0 AND user_id = ${this.userid} ORDER BY c_time DESC`;
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            this.quizHistory = res.data[0] || [];
            if (this.quizHistory.length === 0) {
                let sqlA = `SELECT Id, set_title, attempt_time, used_time FROM test_table_learn_quiz_attempt WHERE user_id = ${this.userid} AND attempt_status = 1 ORDER BY attempt_time DESC`;
                let sqlW = `SELECT attempt_id, COUNT(*) as cnt, GROUP_CONCAT(DISTINCT qiestion_id) as ids FROM test_table_learn_answer_record WHERE user_id = ${this.userid} AND answer_status = 1 AND isDel = 0 GROUP BY attempt_id`;
                let sqlS = `SELECT attempt_id, COUNT(*) as total, SUM(CASE WHEN answer_status = '0' THEN 1 ELSE 0 END) as correct FROM test_table_learn_answer_record WHERE user_id = ${this.userid} GROUP BY attempt_id`;
                let res2 = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sqlA, sqlW, sqlS] },
                    { noVerify: true, noAuth: true });
                let attempts = res2.data[0] || [];
                let wrongMap = {};
                (res2.data[1] || []).forEach(r => { wrongMap[r.attempt_id] = { cnt: parseInt(r.cnt) || 0, ids: r.ids || '' }; });
                let scoreMap = {};
                (res2.data[2] || []).forEach(r => { scoreMap[r.attempt_id] = { total: parseInt(r.total) || 0, correct: parseInt(r.correct) || 0 }; });
                if (attempts.length > 0) {
                    this.quizHistory = attempts.map(a => {
                        let wrong = wrongMap[a.Id] || { cnt: 0, ids: '' };
                        let sd = scoreMap[a.Id] || { total: 0, correct: 0 };
                        let scoreVal = sd.total > 0 ? (sd.correct / sd.total * 100) : 0;
                        let scoreStr = scoreVal % 1 === 0 ? String(Math.round(scoreVal)) : scoreVal.toFixed(1);
                        let secs = parseInt(a.used_time) || 0;
                        let mm = Math.floor(secs / 60), ss = secs % 60;
                        return {
                            Id: '_hist_' + a.Id,
                            array_type: '0',
                            array_name: a.set_title || '练习',
                            final_score: scoreStr,
                            mistake_list: wrong.ids,
                            c_time: a.attempt_time || '',
                            spent_time: secs > 0 ? (mm < 10 ? '0' + mm : mm) + ':' + (ss < 10 ? '0' + ss : ss) : ''
                        };
                    });
                }
            }
        },
        async getNotifications() {
            let sql = `SELECT * FROM test_table_learn_notifications WHERE user_id = ${this.userid} AND isDel = 0 ORDER BY c_time DESC`;
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            this.notifications = res.data[0] || [];
            this.unread_count = this.notifications.filter(v => v.is_read == 0).length;
        },
        async markNotificationRead(item) {
            if (item.is_read == 1) return;
            item.is_read = 1;
            this.unread_count = Math.max(0, this.unread_count - 1);
            this.$forceUpdate();
            let sql = `UPDATE test_table_learn_notifications SET is_read = 1 WHERE Id = ${item.Id}`;
            await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] }, { noVerify: true, noAuth: true });
        },
        async markAllNotificationsRead() {
            this.notifications.forEach(v => { v.is_read = 1; });
            this.unread_count = 0;
            this.$forceUpdate();
            let sql = `UPDATE test_table_learn_notifications SET is_read = 1 WHERE user_id = ${this.userid} AND isDel = 0`;
            await request.post('mysql/updateInfo.jsp', { "sqlstring": [sql] }, { noVerify: true, noAuth: true });
        },
        async getUserStats() {
            if (!this.userid) return;
            let sql1 = `SELECT COUNT(*) as cnt FROM test_table_learn_answer_record WHERE user_id = ${this.userid} AND isDel = 0`;
            let sql2 = `SELECT COUNT(*) as cnt FROM test_table_learn_answer_record WHERE user_id = ${this.userid} AND isDel = 0 AND answer_status = 0`;
            let sql3 = `SELECT COUNT(*) as cnt FROM test_table_learn_mistake_record WHERE user_id = ${this.userid} AND isDel = 0 AND array_type = 1`;
            let sql4 = `SELECT COUNT(DISTINCT DATE(answer_time)) as cnt FROM test_table_learn_answer_record WHERE user_id = ${this.userid} AND isDel = 0`;
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql1, sql2, sql3, sql4] },
                { noVerify: true, noAuth: true });
            this.userStats = {
                total: (res.data[0] && res.data[0][0] ? res.data[0][0].cnt : 0) || 0,
                correct: (res.data[1] && res.data[1][0] ? res.data[1][0].cnt : 0) || 0,
                papers: (res.data[2] && res.data[2][0] ? res.data[2][0].cnt : 0) || 0,
                days: (res.data[3] && res.data[3][0] ? res.data[3][0].cnt : 0) || 0
            };
        },
        async getUnreadCount() {
            if (!this.userid) return;
            let sql = `SELECT COUNT(*) as cnt FROM test_table_learn_notifications WHERE user_id = ${this.userid} AND is_read = 0 AND isDel = 0`;
            let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                { noVerify: true, noAuth: true });
            this.unread_count = (res.data[0] && res.data[0][0] ? res.data[0][0].cnt : 0) || 0;
        },
        async getDailyStatus() {
            if (!this.userid) return;
            let today = new Date();
            let dateStr = today.getFullYear() + '-' +
                String(today.getMonth() + 1).padStart(2, '0') + '-' +
                String(today.getDate()).padStart(2, '0');
            this.dailyDate = dateStr;
            let title = '每日一练_' + dateStr;
            let sql1 = `SELECT Id FROM test_table_learn_quiz_attempt WHERE user_id = ${this.userid} AND set_title = '${title}' AND attempt_status = 0 AND isDel = 0 LIMIT 1`;
            let sql2 = `SELECT Id FROM test_table_learn_mistake_record WHERE user_id = ${this.userid} AND array_name = '${title}' AND isDel = 0 LIMIT 1`;
            try {
                let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql1, sql2] },
                    { noVerify: true, noAuth: true });
                this.dailyHasProgress = (res.data[0] || []).length > 0;
                this.dailyDone = (res.data[1] || []).length > 0;
            } catch(e) {}
        },
        async toDailyPractice() {
            let today = new Date();
            let dateStr = today.getFullYear() + '-' +
                String(today.getMonth() + 1).padStart(2, '0') + '-' +
                String(today.getDate()).padStart(2, '0');
            let title = '每日一练_' + dateStr;
            this.questLoad = true;
            this.info.mode = 0;
            this.info.title = title;
            this.info.range = '';
            this.info.isDailyPractice = true;
            // 第一步：只拉 Id，数据量远小于 SELECT *
            let idRes = await request.post('mysql/getDataListBySql.jsp',
                { "sqlstring": [`SELECT Id FROM test_table_learn_question_list WHERE isDel = 0`] },
                { noVerify: true, noAuth: true });
            let allIds = idRes.data[0] || [];
            if (!allIds.length) {
                this.$alert('暂无题目，请联系工作人员处理', { confirmButtonText: '确定' });
                this.questLoad = false;
                return;
            }
            // 第二步：洗牌取前10个 Id
            let seed = parseInt(dateStr.replace(/-/g, ''));
            let shuffledIds = this.seededShuffle(allIds, seed).slice(0, Math.min(10, allIds.length));
            let selectedIds = shuffledIds.map(q => q.Id).join(',');
            // 第三步：并行拉取完整题目数据 + 进度 + 次数
            let [qRes] = await Promise.all([
                request.post('mysql/getDataListBySql.jsp',
                    { "sqlstring": [`SELECT * FROM test_table_learn_question_list WHERE Id IN (${selectedIds})`] },
                    { noVerify: true, noAuth: true }),
                this.doProgress('read'),
                this.queryAttempts(title)
            ]);
            // 按洗牌顺序排列题目
            let qMap = {};
            (qRes.data[0] || []).forEach(q => { qMap[q.Id] = q; });
            this.questionList = shuffledIds.map(q => qMap[q.Id]).filter(Boolean);
            this.questLoad = false;
            const pages = document.querySelectorAll('.page');
            pages.forEach(p => p.classList.remove('active'));
            const targetPage = document.getElementById('page-quizready');
            if (targetPage) {
                targetPage.classList.add('active');
                document.getElementById('main-screen').scrollTop = 0;
            }
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        },
        seededShuffle(arr, seed) {
            let shuffled = [...arr];
            let s = seed;
            for (let i = shuffled.length - 1; i > 0; i--) {
                s = ((s * 1664525) + 1013904223) & 0x7fffffff;
                let j = s % (i + 1);
                let tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
            }
            return shuffled;
        },
        async getUserAvatar() {
            if (!this.userid) return;
            try {
                let sql = `SELECT pic_url FROM test_table_upload_pic WHERE user_id = ${this.userid} AND isDel = 0 ORDER BY Id DESC LIMIT 1`;
                let res = await request.post('mysql/getDataListBySql.jsp', { "sqlstring": [sql] },
                    { noVerify: true, noAuth: true });
                if (res.data[0] && res.data[0].length > 0 && res.data[0][0].pic_url) {
                    this.avatar_url = res.data[0][0].pic_url;
                }
            } catch(e) {}
        },
    }
});

// 页面切换逻辑
function switchPage(pageId) {
    if (pageId == 'sp-video') {
        let userid_base64 = vue_script.userid ? btoa(vue_script.userid) : '';
        let username_base64 = vue_script.userInfo.name ? btoa(encodeURI(vue_script.userInfo.name)) : '';
        window.location.replace('https://www.wiidu.com.cn/zx/customForm/mp.html?a=1&tblname=video_learn_watch&R=55924.5635599971' + '&userid=' + userid_base64 + '&username=' + username_base64);
        return false;
    }
    // 隐藏所有页面
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));

    // 显示目标页面
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        // 滚动到顶部
        document.getElementById('main-screen').scrollTop = 0;
    }

    // 更新导航栏状态
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        const label = item.querySelector('span').innerText;
        if ((pageId === 'home' && label === '首页') || (pageId === 'mistake-history' && label === '错题统计') ||
            (pageId === 'mistakes' && label === '错题重练') ||
            (pageId === 'profile' && label === '我的')) {
            item.classList.add('active');
        }
    });

    // 隐藏/显示底部导航（某些特定页面如答题页需要隐藏）
    const bottomNav = document.getElementById('bottom-nav');
    if (pageId === 'quiz' || pageId === 'login' || pageId === 'register') {
        bottomNav.style.display = 'none';
    } else {
        bottomNav.style.display = 'flex';
    }

    if (pageId == 'mistakes') {
        vue_script.querymistakes()
    }
    if (pageId == 'mistake-history') {
        vue_script.getMistakeHistory();
        vue_script.getMarked();
    }
    if (pageId == 'history') {
        vue_script.getQuizHistory();
    }
    if (pageId == 'notifications') {
        vue_script.getNotifications();
    }
    if (pageId == 'home') {
        vue_script.getUserStats();
        vue_script.getDailyStatus();
        vue_script.getWeakPoints();
    }
    if (pageId == 'profile') {
        vue_script.profileForm.name = '';
        vue_script.profileForm.oldPassword = '';
        vue_script.profileForm.newPassword = '';
        vue_script.profileForm.confirmPassword = '';
    }
}

window.onload = () => {
    let params = new URLSearchParams(window.location.search);
    console.log(params)
    console.log(params.get('userid'))
    vue_script.userid = atob(params.get('userid') || '')
    if (vue_script.userid != 0) {
        vue_script.autoLog();
        return false
    }
    let userCache = sessionStorage.getItem('user_cache') || '';

    if (userCache) {
        userCache = JSON.parse(userCache);
        console.log(userCache)
        if (userCache.userid && userCache.phone) {
            vue_script.userid = userCache.userid;
            vue_script.userInfo = userCache;
            switchPage('home')
            vue_script.getUserStats();
            vue_script.getUnreadCount();
            vue_script.getDailyStatus();
            vue_script.getUserAvatar();
            vue_script.getWeakPoints();
        } else {
            switchPage('login')
        }
    } else {
        switchPage('login');
    }
    // switchPage('result')
};
