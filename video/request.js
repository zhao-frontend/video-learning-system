let HTTP_REQUEST_URL = 'https://www.mock';
let HEADER = {
    'Content-Type': 'application/json; charset=UTF-8;',
    'Form-type': navigator.userAgent.toLowerCase().indexOf("micromessenger") !== -1 ? 'wechat' : 'h5',
}
// 回话密钥名称 请勿修改此配置
let TOKENNAME = 'X-Token';
function baseRequest(url, method, data, {
    noAuth = false,
    noVerify = false
}) {
    let Url = HTTP_REQUEST_URL,
        header = HEADER;
    return new Promise((reslove, reject) => {
        $.ajax({
            url: Url + 'mock' + url,
            type: method || 'GET',
            header: url.indexOf('mock') >= 0 ? '' : header,
            // processData: false,
            dataType: 'json',
            data: JSON.stringify(data) || {},
            success: (res) => {
                // console.log(data)
                if (res.data && res.data.encode) {
                    try {
                        res.data = JSON.parse(decompress(res.data.data));
                    } catch (e) {
                        res.data = decompress(decodeURI(res.data.data));
                    }
                }
                if (noVerify)
                    reslove(res);
                else if (res.data.status == 200)
                    reslove(res.data, res);
                else if ([410000, 410001, 410002, 40000].indexOf(res.data.status) !== -1) {
                    reject(res.data);
                } else if (res.data.status == 501) {
                    t(res.data);
                } else
                    reject(res.data.message || '系统错误');
            },
            fail: (message) => {
                reject('请求失败');
            }
        })
    });
}
const request = {};
['options', 'get', 'post', 'put', 'head', 'delete', 'trace', 'connect'].forEach((method) => {
    request[method] = (api, data, opt) => baseRequest(api, method, data, opt || {})
});
// export default request;
