document.write(`
<script>
 $('body').css('display', 'block')
$('#saveFormInfoBtn').css('z-index', '100')
$('phone-container').css('height', '100vh')
</script>
   <style>
        html {
            font-size: inherit !important;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            text-align: initial;
        }

        .el-loading-spinner {
            left: 50%;
            transform: translate(-50%, -50%);
            width: max-content;
        }

        .el-message-box__wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }

        .el-message-box {
            width: 100%;
            max-width: 420px;

        }

        .el-message-box__container {
            display: flex;
            flex-direction: column !important;
            align-items: center;
        }

        .el-message-box__status {
            position: static;
            font-size: 64px !important;
            margin-bottom: 16px;
            transform: none !important;
            -webkit-transform: none !important;
        }

        .el-message-box__status+.el-message-box__message {
            padding: 0 12px !important;
        }

        .el-message-box__btns {
            display: flex;
            justify-content: space-between;
            gap: 8px;
        }

        .el-message-box__btns button:nth-child(2) {
            margin-left: 0;
            background-color: rgb(37 99 235);
        }

        .el-message-box__btns>button {
            flex: 1;
            margin: 0;
            font-size: 16px !important;
        }

        .el-message-box__message {
            font-size: 16px;
        }

        .phone-container {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            left: 50%;
            transform: translate(-50%, 0);
        }

        .phone-screen {
            width: 100%;
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            padding-bottom: 80px;
            scrollbar-width: none;
        }

        @media screen and (min-width: 768px) {
            .phone-container {
                height: 100vh;
                width: auto;
                aspect-ratio: 3/4;
            }
        }

        .phone-screen::-webkit-scrollbar {
            display: none;
        }

        .page {
            display: none;
            animation: fadeIn 0.3s ease-in-out;
        }

        .page.active {
            display: block;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .custom-scroll {
            scrollbar-width: thin;
            scrollbar-color: #e2e8f0 transparent;
        }

        .nav-item.active {
            color: #2563eb;
        }

        .option-card.selected {
            border-color: #2563eb;
            background-color: #eff6ff;
        }
    </style>
       <div class="phone-container" id="container">
        <div class="phone-screen bg-white" id="main-screen">
            <!--首页 -->
            <div class="page active px-4 pt-4" id="page-home">
                <div class="flex justify-between items-center mb-6">
                    <div class="flex items-center gap-3">
                        <div
                            class="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2 border-blue-100">
                            <iconify-icon icon="mdi:user" class="text-2xl"></iconify-icon>
                        </div>
                        <div>
                            <h2 class="text-sm font-bold text-slate-800">{{userInfo.name || userInfo.phone}}</h2>
                            <p class="text-[10px] text-slate-500">欢迎</p>
                        </div>
                    </div>
                    <div class="relative">
                        <iconify-icon @click="doLogOut()" class="text-xl text-slate-600"
                            icon="mingcute:exit-line"></iconify-icon>
                    </div>
                </div>
                <div class="bg-white mb-6" v-if="false">
                    <h3 class="text-lg font-bold text-slate-800 mb-4">套卷练习</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="text-base text-slate-600 mb-2 block uppercase tracking-wider">选择套卷</label>
                            <select
                                class="bg-slate-50 p-3 flex w-full justify-between items-center text-base text-slate-700"
                                v-model="chosenRange">
                                <option value="" active>请选择套卷</option>
                                <option :value="item.Id" class="" v-for="(item, index) in collectionList" :key="index">
                                    {{item.collection_fullname }}</option>
                            </select>
                        </div>
                        <button class="w-full py-2 bg-blue-600 text-white font-semibold text-base"
                            @click="toCollection(chosenRange)">开始练习</button>
                    </div>
                </div>
                <!-- 推荐练习 -->
                <div class="mb-4">
                    <h3 class="font-bold text-slate-800 mb-4 text-lg">题库列表</h3>
                    <div class="space-y-3 selist">
                        <div v-for="(item, index) in seList" :key="index" @click="toQuiz(item.subject_title)"
                            class="bg-white p-4 border border-slate-50 flex justify-between items-center shadow-md">
                            <div class="flex gap-3 items-center">
                                <div class="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"
                                    v-if="item.iconfont_type == 1">
                                    <iconify-icon class="text-3xl"
                                        :icon="item.subject_icon || 'lucide:flame'"></iconify-icon>
                                </div>
                                <div v-else
                                    class="w-12 h-12 bg-blue-50 flex items-center justify-center overflow-hidden">
                                    <img :src="item.subject_icon_link" class="w-full h-full object-cover" alt="">
                                </div>
                                <div>
                                    <h4 class="text-base font-semibold text-slate-800">{{item.subject_title}}</h4>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="page min-h-full bg-white" id="page-mistake-history">
                <div
                    class="review-header px-4 py-6 border-b-neutral-300 border-b-[1px] sticky w-full top-0 left-0 bg-white z-[10]">
                    <div class="review-title flex items-center justify-center">
                        <div class=" flex border-[1px] border-blue-600 rounded-sm">
                            <div class="px-6 py-1 text-sm text-center"
                                :class="active_history_type == ''? 'bg-blue-600 text-white' : 'text-blue-600'"
                                @click="active_history_type = ''">
                                全部({{mistake_history.length}})</div>
                            <div class="px-6 py-1 text-sm text-center"
                                :class="active_history_type == '单选'? 'bg-blue-600 text-white' : 'text-blue-600'"
                                @click="active_history_type = '单选'">
                                单选({{mistake_history_cate.single}})</div>
                            <div class="px-6 py-1 text-sm text-center"
                                :class="active_history_type == '多选'? 'bg-blue-600 text-white' : 'text-blue-600'"
                                @click="active_history_type = '多选'">
                                多选({{mistake_history_cate.multi}})</div>
                            <div class="px-6 py-1 text-sm text-center"
                                :class="active_history_type == '判断'? 'bg-blue-600 text-white' : 'text-blue-600'"
                                @click="active_history_type = '判断'">
                                判断({{mistake_history_cate.tof}})</div>
                        </div>
                    </div>
                </div>
                <div class="mistake-list flex flex-col">
                    <div class="p-4 text-center text-base" v-if="filtered_history.length == 0">
                        暂无数据
                    </div>
                    <div v-for="(item, index) in filtered_history" @click="showRemark(item)"
                        class="panel-block border-b-[1px] p-4 border-neutral-300">
                        <div class="text-neutral-600 text-sm">{{item.answer_time}}</div>
                        <div class="flex items-center pt-1">
                            <div class="flex-1">
                                <div class="flex items-center text-base">
                                    {{item.question_name}}
                                </div>
                                <div class="text-neutral-500 text-sm pt-1" v-if="item.question_type != '判断'">
                                    <p>正确答案：<span class="text-green-400">{{item.answer_correct}}</span></p>
                                    <p>您选择：<span class="text-red-400">{{item.answer_user}}</span></p>
                                </div>
                                <div class="text-neutral-500 text-sm pt-1" v-else>
                                    <p>正确答案：<span class="text-green-400">{{item.answer_correct == 'A'? '正确' :
                                            '错误'}}</span></p>
                                    <p>您选择：<span class="text-red-400">{{item.answer_user == 'A'? '正确' : '错误'}}</span>
                                    </p>
                                </div>
                                <div class="text-neutral-500 text-sm pt-1">
                                    点击查看解析
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="page min-h-full bg-white" id="page-mistakes">
                <div
                    class="review-header px-4 py-6 border-b-neutral-300 border-b-[1px] sticky w-full top-0 left-0 bg-white z-[10]">
                    <div class="review-title flex items-center justify-center">
                        <div class=" flex border-[1px] border-blue-600 rounded-sm">
                            <div class="px-6 py-1 text-base"
                                :class="mistakes_active == 0? 'bg-blue-600 text-white' : 'text-blue-600'"
                                @click="mistakes_active = 0">
                                题库({{mistakes_sets}})</div>
                            <div class="px-6 py-1 text-base"
                                :class="mistakes_active == 1? 'bg-blue-600 text-white' : 'text-blue-600'"
                                @click="mistakes_active = 1">
                                套卷({{mistakes_collections}})</div>
                        </div>
                    </div>
                </div>
                <div class="mistake-list flex flex-col">
                    <div class="p-4 text-center text-base" v-if="filtered_mistakes.length == 0">
                        暂无数据
                    </div>
                    <div v-for="(item, index) in filtered_mistakes" @click="toMistake(item.mistake_list)"
                        class="panel-block border-b-[1px] p-4 border-neutral-300">
                        <div class="text-neutral-600 text-sm">{{item.c_time}}</div>
                        <div class="flex items-center pt-1">
                            <div class="flex-1">
                                <div class="flex items-center text-base">
                                    <span
                                        class="bg-neutral-500 me-2 text-white font-semibold py-1 px-2 rounded-sm text-sm">
                                        {{item.array_type == 0? '题库' : '套卷'}}练习
                                    </span>
                                    {{item.array_name}}
                                </div>
                                <div class="text-neutral-500 text-sm pt-1">
                                    共<span class="text-blue-600">{{item.final_score == 0?
                                        item.mistake_list.split(',').length :
                                        (item.mistake_list.split(',').length/(1-parseFloat(item.final_score)/100)).toFixed(0)}}</span>道
                                    &nbsp;&nbsp;
                                    答错：<span class="text-red-600">{{item.mistake_list.split(',').length}}</span>道
                                    &nbsp;&nbsp;
                                    <span v-if="item.spent_time">用时：{{item.spent_time}}</span>
                                </div>
                            </div>
                            <div
                                class="text-blue-400 border-[2px] border-blue-600 w-11 h-11 rounded-full flex flex-col items-center justify-center">
                                <span class="text-[12px] font-semibold">
                                    {{parseFloat(item.final_score)%1 > 0?
                                    parseFloat(item.final_score).toFixed(1):item.final_score}}%
                                </span>
                                <span class="text-[8px]">准确率</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="page px-4 pt-4 min-h-full bg-white" v-loading="questLoad" id="page-quizready">
                <div class="flex justify-between items-center">
                    <div class="flex items-center flex-1">
                        <button class="text-slate-400 me-2" style="height: 20px;" onclick="switchPage('home')">
                            <iconify-icon class="text-xl" icon="lucide:x"></iconify-icon>
                        </button>
                    </div>
                </div>
                <div class="text-center p-4 pt-0">
                    <p class="text-2xl font-semibold mb-1">{{info.title}}</p>
                    <span class="text-sm text-neutral-600">共{{questionList.length}}题，累计尝试{{info.attempts}}次</span>
                </div>
                <div class="flex flex-col items-center">
                    <button class="border-neutral-300 border-[2px] w-[196px] py-2 mb-4 rounded-full text-base"
                        @click="getQuizReady()">开始作答</button>
                    <button v-if="hasData" @click="loadQuizData()"
                        class="border-neutral-300 border-[2px] w-[196px] py-2 mb-2 rounded-full text-base">继续上次的作答</button>
                </div>
            </div>
            <div class="page px-4 pt-4 min-h-full bg-white" id="page-throughout">

            </div>
            <!-- 6. 答题页面 -->
            <div class="page px-4 pt-4 min-h-full bg-white" v-loading="questLoad" id="page-quiz">
                <div class="flex justify-between items-center mb-6">
                    <div class="flex items-center flex-1">
                        <button class="text-slate-400 me-2 flex items-center" style="height: 20px;"
                            @click="closeQuest()">
                            <iconify-icon class="text-xl" icon="lucide:chevron-left"></iconify-icon>
                            <span class="text-xs">返回首页</span>
                        </button>
                        <div class="flex flex-col items-center">
                            <span class="text-sm text-black"><span class="current_quest_no">{{currentQuest
                                    +
                                    1}}</span> / <span
                                    class="total_quest text-slate-600">{{questionList.length}}</span></span>
                        </div>
                    </div>

                    <div class="flex items-center gap-1 text-black">
                        <!-- <iconify-icon class="text-sm" icon="lucide:clock"></iconify-icon> -->
                        <span class="text-sm">{{parseInt(time/60)<10? '0' + (parseInt(time/60)) :
                                parseInt(time/60)}}:{{time - (60 * parseInt(time/60)) < 10? '0' +(time - (60 *
                                parseInt(time/60))) : time - (60 * parseInt(time/60))}}</span>
                    </div>
                    <div class="flex-1 text-right text-xl">
                        <!-- <iconify-icon icon="fluent:text-bullet-list-square-edit-24-regular"></iconify-icon> -->
                    </div>
                </div>

                <!-- 题目区 -->
                <div class="mb-8" v-if="questionList[currentQuest]">
                    <p class="text-base text-black leading-relaxed mb-6 question_title">
                        <span
                            class="text-slate-600">【{{questionList[currentQuest].question_type}}题】</span>{{questionList[currentQuest].question_title}}
                    </p>
                    <div class="flex justify-center mb-4" v-if="questionList[currentQuest].question_img">
                        <img class="w-full max-w-[192px] h-auto" :src="questionList[currentQuest].question_img" alt="">
                    </div>
                    <!-- 选项区 -->
                    <div class="space-y-3">
                        <div class="question_a_outer p-2 flex items-center gap-4 cursor-pointer transition-all"
                            @click="selectOption(this, 'A')">
                            <div class="a-mark shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-base"
                                :class="questionStat.A === 2? 'text-slate-50 bg-green-400 border-green-400' : questionStat.A === 1? 'text-slate-50 bg-blue-400 border-blue-400' : questionStat.A === -1? 'text-slate-50 bg-red-400 border-red-400' : questionStat.A === -2? 'text-slate-50 bg-yellow-400 border-yellow-400' : 'text-black bg-white border-neutral-300'">
                                A</div>
                            <span class="text-base text-black question_a">{{questionList[currentQuest].answer_a}}</span>
                        </div>
                        <div class="question_b_outer p-2 flex items-center gap-4 cursor-pointer transition-all"
                            @click="selectOption(this, 'B')">
                            <div class="b-mark shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-base"
                                :class="questionStat.B === 2? 'text-slate-50 bg-green-400 border-green-400' : questionStat.B === 1? 'text-slate-50 bg-blue-400 border-blue-400' : questionStat.B === -1? 'text-slate-50 bg-red-400 border-red-400' : questionStat.B === -2? 'text-slate-50 bg-yellow-400 border-yellow-400' : 'text-black bg-white border-neutral-300'">
                                B</div>
                            <span class="text-base text-black question_b">{{questionList[currentQuest].answer_b}}</span>
                        </div>
                        <div class="question_c_outer p-2 flex items-center gap-4 cursor-pointer transition-all"
                            v-show="questionList[currentQuest].answer_c" @click="selectOption(this, 'C')">
                            <div class="c-mark shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-base"
                                :class="questionStat.C === 2? 'text-slate-50 bg-green-400 border-green-400' : questionStat.C === 1? 'text-slate-50 bg-blue-400 border-blue-400' : questionStat.C === -1? 'text-slate-50 bg-red-400 border-red-400' : questionStat.C === -2? 'text-slate-50 bg-yellow-400 border-yellow-400' : 'text-black bg-white border-neutral-300'">
                                C</div>
                            <span class="text-base text-black question_c">{{questionList[currentQuest].answer_c}}</span>
                        </div>
                        <div class="question_d_outer  p-2 flex items-center gap-4 cursor-pointer transition-all"
                            v-show="questionList[currentQuest].answer_c && questionList[currentQuest].answer_d"
                            @click="selectOption(this, 'D')">
                            <div class="d-mark shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-base"
                                :class="questionStat.D === 2? 'text-slate-50 bg-green-400 border-green-400' : questionStat.D === 1? 'text-slate-50 bg-blue-400 border-blue-400' : questionStat.D === -1? 'text-slate-50 bg-red-400 border-red-400' : questionStat.D === -2? 'text-slate-50 bg-yellow-400 border-yellow-400' : 'text-black bg-white border-neutral-300'">
                                D</div>
                            <span class="text-base text-black question_d">{{questionList[currentQuest].answer_d}}</span>
                        </div>
                        <div class="question_e_outer  p-2 flex items-center gap-4 cursor-pointer transition-all"
                            v-show="questionList[currentQuest].answer_c && questionList[currentQuest].answer_d && questionList[currentQuest].answer_e"
                            @click="selectOption(this, 'E')">
                            <div class="e-mark shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-base"
                                :class="questionStat.E === 2? 'text-slate-50 bg-green-400 border-green-400' : questionStat.E === 1? 'text-slate-50 bg-blue-400 border-blue-400' : questionStat.E === -1? 'text-slate-50 bg-red-400 border-red-400' : questionStat.E === -2? 'text-slate-50 bg-yellow-400 border-yellow-400' : 'text-black bg-white border-neutral-300'">
                                E</div>
                            <span class="text-base text-black question_d">{{questionList[currentQuest].answer_e}}</span>
                        </div>
                    </div>
                </div>
                <div class="bg-white wrong_answer"
                    v-if="questionList[currentQuest] && questionList[currentQuest].is_correct === false">
                    <div class="bg-neutral-100 p-2 mb-4 flex items-center">
                        <p class="text-base ">答案<span
                                class="answer_correct text-green-600 ms-2">{{questionList[currentQuest].answer_correct}}</span>
                        </p>
                        <p class="text-base ms-2">您选择<span
                                class="answer_user text-red-600 ms-2">{{chosenAnswer.join(',')}}</span>
                        </p>
                    </div>
                </div>
                <div class="text-left"
                    v-if="questionList[currentQuest] && questionList[currentQuest].is_answered === true">
                    <p class="text-lg text-center font-semibold mb-4">试题详解</p>
                    <p class="text-base font-bold flex items-center mb-4">
                        <span class="inline-block h-[16px] w-[4px] rounded-2xl bg-blue-400 me-2"></span>
                        本题考点
                    </p>
                    <p class="text-base mb-4">
                        {{questionList[currentQuest].question_remark}}
                    </p>
                    <p class="text-base font-bold flex items-center mb-4">
                        <span class="inline-block h-[16px] w-[4px] rounded-2xl bg-blue-400 me-2"></span>
                        难易程度
                    </p>
                    <p class="text-base mb-4">
                        {{questionList[currentQuest].question_difficulty}}
                    </p>
                </div>
                <div class="p-6 bg-white"></div>
                <!-- 底部操作 -->
                <div v-if="questionList[currentQuest]"
                    class="fixed bg-white bottom-0 py-4 left-0 right-0 px-8 flex justify-between items-center">
                    <!-- <button class="flex items-center gap-2 text-slate-400">
                        <iconify-icon class="text-lg" icon="lucide:flag"></iconify-icon>
                        <span class="text-[10px] font-bold">标记疑问</span>
                    </button> -->
                    <div>
                        <button @click="prevQuestion()" v-if="currentQuest != 0"
                            class="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-400">
                            <iconify-icon class="text-xl" icon="lucide:chevron-left"></iconify-icon>
                        </button>
                    </div>
                    <div class="flex gap-4">

                        <!-- <div class="flex-1"></div> -->
                        <button @click="checkAnswer()"
                            v-if="questionList[currentQuest].question_type == '多选' && !questionList[currentQuest].is_answered"
                            class="px-8 h-10 bg-blue-600 text-white  font-semibold text-sm quest_confirm">确定</button>
                        <button @click="submitQuest()"
                            v-if="currentQuest + 1 == questionList.length && !statistic.complete"
                            class="px-8 h-10 bg-blue-600 text-white  font-semibold text-sm">提交</button>
                        <button onclick="switchPage('result')" v-if="statistic.complete"
                            class="px-8 h-10 bg-blue-600 text-white  font-semibold text-sm">结果</button>
                        <button @click="nextQuestion()"
                            v-if="currentQuest + 1 != questionList.length && questionList[currentQuest].is_answered"
                            class="px-8 h-10 bg-blue-600 text-white  font-semibold text-sm">下一题</button>
                    </div>
                </div>
            </div>
            <div class="page px-4 pt-4 min-h-full bg-white" id="page-result">
                <div class="result-header flex flex-col items-center">
                    <p class="text-lg font-semibold">最终成绩</p>
                    <div
                        class="score-sect text-xl mt-2 w-16 h-16 rounded-full flex flex-col items-center justify-center text-center border-2 border-blue-400">
                        <span class="text-[10px] mb-[-4px]">您的分数:</span>
                        <span>{{statistic.total_score%1 > 0? statistic.total_score.toFixed(0) :
                            statistic.total_score}}</span>
                    </div>
                    <div class="card w-full bg-white mt-4">
                        <div class="card-footer flex justify-between mx-4 bg-neutral-400 gap-[1px]">
                            <div class="card-footer-item my-[-4px] analyze-item text-center flex-1 bg-white text-base">
                                <div class="text-base">正确题数</div>
                                <div class="text-green-400 text-base">{{statistic.correct}}</div>
                            </div>
                            <div class="card-footer-item my-[-4px] analyze-item text-center flex-1 bg-white text-base">
                                <div class="text-base">错误题数</div>
                                <div class="text-red-400 text-base">{{statistic.incorrect}}</div>
                            </div>
                            <div class="card-footer-item my-[-4px] analyze-item text-center flex-1 bg-white text-base">
                                <div class="text-base">用时</div>
                                <div class="text-blue-400 text-base">{{parseInt(statistic.time/60)<10? '0' +
                                        (parseInt(statistic.time/60)) : parseInt(statistic.time/60)}}:{{statistic.time -
                                        (60 * parseInt(statistic.time/60)) < 10? '0' +(statistic.time - (60 *
                                        parseInt(statistic.time/60))) : statistic.time - (60 *
                                        parseInt(statistic.time/60))}}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="analyze-sect mt-4">
                        <div class="text-base font-bold flex items-center mb-2">
                            <span class="inline-block h-[16px] w-[4px] rounded-2xl bg-blue-400 me-2"></span>
                            题目分析
                        </div>

                        <div class="quest-grid">
                            <div class="">
                                <div class="grid grid-cols-5">
                                    <div class="flex justify-center py-2" v-for="(item, index) in questionList">
                                        <button @click="toChosenQuestion(item, index)"
                                            class="w-8 h-8 rounded-full border flex items-center justify-center text-base"
                                            :class="item.is_correct? 'text-slate-50 bg-green-400 border-green-400' : 'text-slate-50 bg-red-400 border-red-400'">{{index+1}}</button>
                                    </div>

                                </div>
                            </div>
                        </div>

                    </div>
                    <div class="flex gap-4 mt-4">
                        <button class="flex-1 py-2 bg-blue-600 text-white font-semibold text-sm"
                            @click="retryQuest()">重试</button>
                        <button class="flex-1 py-2 bg-blue-600 text-white font-semibold text-sm"
                            onclick="switchPage('home')">回到主页</button>

                    </div>
                </div>
                <div class="page px-4 pt-4 min-h-full bg-white" id="page-login">
                    <div id="loginForm" class="p-6 space-y-4">
                        <h2 class="text-2xl font-bold text-center text-gray-800 mb-4">真题模拟练习系统</h2>

                        <!-- 账号 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                            <div class="relative">
                                <span class="absolute left-3 top-[calc(50%+1.5px)] -translate-y-1/2 text-gray-400">
                                    <iconify-icon icon="proicons:phone" class="text-base"></iconify-icon>
                                </span>
                                <input type="text" v-model="logForm.phone"
                                    class="w-full pl-10 text-base pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="请输入手机号">
                            </div>
                        </div>

                        <!-- 密码 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
                            <div class="relative">
                                <span class="absolute left-3 top-[calc(50%+1.5px)] -translate-y-1/2 text-gray-400">
                                    <iconify-icon icon="solar:lock-password-line-duotone"
                                        class="text-base"></iconify-icon>
                                </span>
                                <input type="password" v-model="logForm.password"
                                    class="w-full pl-10 text-base pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="请输入密码">
                            </div>
                        </div>

                        <div class="flex items-center justify-end text-sm">
                            <!-- <label class="flex items-center gap-1 cursor-pointer">
                                <input v-model="logForm.remember" type="checkbox" class="rounded text-blue-600">
                                <span class="text-gray-600">自动登录</span>
                            </label> -->
                            <!-- <span onclick="switchPage('register')" class="text-blue-600 hover:underline">注册</span> -->
                            <!-- <a href="#" class="text-blue-600 hover:underline">忘记密码？</a> -->
                        </div>

                        <!-- 登录按钮 -->
                        <button type="button" @click="doLogin"
                            class="w-full text-base bg-blue-600 text-white py-2 hover:bg-blue-700 transition-colors font-medium">
                            登录
                        </button>
                    </div>

                </div>
                <div class="page px-4 pt-4 min-h-full bg-white" id="page-register">

                    <div class="flex justify-between items-center">
                        <div class="flex items-center flex-1">
                            <button class="text-slate-400 me-2" style="height: 20px;" onclick="switchPage('login')">
                                <iconify-icon class="text-xl" icon="lucide:x"></iconify-icon>
                            </button>
                        </div>
                    </div>
                    <div id="registerForm" class="p-6 space-y-4">
                        <h2 class="text-2xl font-bold text-center text-gray-800 mb-4">创建账号</h2>

                        <!-- 用户名 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                            <div class="relative">
                                <span
                                    class="absolute text-base left-3 top-[calc(50%+1.5px)] -translate-y-1/2 text-gray-400">
                                    <iconify-icon icon="proicons:phone" class="text-base"></iconify-icon>
                                </span>
                                <input type="text" v-model="regForm.phone"
                                    class="w-full text-base pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="请输入手机号">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                            <div class="relative">
                                <span
                                    class="absolute text-base left-3 top-[calc(50%+1.5px)] -translate-y-1/2 text-gray-400">
                                    <iconify-icon icon="radix-icons:avatar" class="text-base"></iconify-icon>
                                </span>
                                <input type="text" v-model="regForm.name"
                                    class="w-full text-base pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="请输入姓名">
                            </div>
                        </div>
                        <!-- 邮箱 -->


                        <!-- 密码 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">设置密码</label>
                            <div class="relative">
                                <span
                                    class="absolute left-3 text-base top-[calc(50%+1.5px)] -translate-y-1/2 text-gray-400">
                                    <iconify-icon icon="solar:lock-password-line-duotone"
                                        class="text-base"></iconify-icon>
                                </span>
                                <input type="password" v-model="regForm.password"
                                    class="w-full pl-10 pr-4 text-base py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="请输入密码">
                            </div>
                            <span class="text-xs text-gray-600">密码需要至少6个字符，并包含字母与数字</span>
                        </div>

                        <!-- 确认密码 -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                            <div class="relative">
                                <span
                                    class="absolute left-3 text-base top-[calc(50%+1.5px)] -translate-y-1/2 text-gray-400">
                                    <iconify-icon icon="solar:lock-password-line-duotone"
                                        class="text-base"></iconify-icon>
                                </span>
                                <input type="password" v-model="regForm.passConf"
                                    class="w-full pl-10 text-base pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="请再次输入密码">
                            </div>
                        </div>
                        <div>
                            <div class="relative">
                                <div id="captcha" class="xsukax-captcha"></div>
                            </div>
                        </div>
                        <!-- 注册按钮 -->
                        <button type="button" @click="doRegister()"
                            class="w-full bg-blue-600 text-base text-white py-2 hover:bg-blue-700 transition-colors font-medium">
                            注册
                        </button>
                        <!-- <button type="button" v-if="!isVerified"
                            class="w-full bg-neutral-300 text-base text-white py-2 hover:bg-blue-700 transition-colors font-medium">
                            请先验证
                        </button> -->
                    </div>
                </div>
            </div>

            <!-- 底部导航栏 -->
            <div class="absolute bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-t border-slate-100 flex items-center justify-around px-2 z-50 rounded-b-[40px]"
                id="bottom-nav">
                <div class="nav-item active flex flex-col items-center gap-1 cursor-pointer transition-all"
                    onclick="switchPage('home')">
                    <iconify-icon class="text-xl" icon="lucide:home"></iconify-icon>
                    <span class="text-[10px] font-bold">首页</span>
                </div>
                <!-- onclick="switchPage('mistakes')" -->
                <div class="nav-item flex flex-col items-center gap-1 cursor-pointer transition-all"
                    onclick="switchPage('mistake-history')">
                    <iconify-icon class="text-xl" icon="material-symbols:history-rounded"></iconify-icon>
                    <span class="text-[10px] font-bold">错题统计</span>
                </div>
                <div class="nav-item flex flex-col items-center gap-1 cursor-pointer transition-all"
                    onclick="switchPage('mistakes')">
                    <iconify-icon class="text-xl" icon="lucide:book-x"></iconify-icon>
                    <span class="text-[10px] font-bold">错题重练</span>
                </div>
                <!-- <div class="nav-item flex flex-col items-center gap-1 cursor-pointer transition-all"
                onclick="switchPage('profile')">
                <iconify-icon class="text-xl" icon="lucide:user"></iconify-icon>
                <span class="text-[10px] font-bold">我的</span>
            </div> -->
            </div>
        </div>
    
`)