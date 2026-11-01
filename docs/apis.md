/captchaImage
get
无需 token。返回 data: { img(base64, 拼 data:image/gif;base64,), uuid }

/captchaSms
get
无需 token。params: { phonenumber, flag, type }

/captchaSmsConfirm
get
无需 token。params: { phonenumber, code }

/app/login
post
无需 token。body: { username, password, code, uuid, schoolId: "14241" }
返回 data.token

/smsLogin
post
无需 token。body: { phonenumber, code, ... }
返回 data.token

/appSchoolLoginByToken
post
query params: { userToken }（注意：不是 body）
SSO 场景：用外部 userToken 换取登录。不能用于校验 App 自身 token，否则会误返"登录凭证已过期"

/loginByToken
post
query params: { token }（参数名按命名推断，未经验证）
按 token 获取单个用户信息

/getInfo
get
带 token。返回 { code, msg, data: { user }, roles, permissions }
user: { userId, userName, avatar, schoolId, schoolName, status, ... }
code 200 即 token 有效，启动时用它校验持久化的登录态

/logout
post
带 token，无参

/message/message/todolistApp
get
{
    pageSize: 10, pageNum: *, messageStatus: *(1=代办, 2=已办; 文档注释 0=已办 与实际不符),
        messageTitle: "", platform: 1
}

/activity/activityInfo/myActivitiyInfoByStudent
get
{
    pageSize: 1, pageNum: 1, type: 1
}
返回 { code, msg, total, rows }
