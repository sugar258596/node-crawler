import axios from 'axios'
import { parse } from 'node-html-parser';
import iconv from 'iconv-lite';
import * as fs from 'fs';
import readline from 'readline';

// 菜单
const menu = [
    { '4K动漫': '4kdongman', },
    { '4K风景': '4kfengjing', },
    { '4K美女': '4kmeinv', },
    { '4K游戏': '4kyouxi', },
    { '4K影视': '4kyingshi', },
    { '4K汽车': '4kqiche', },
    { '4K动物': '4kdongwu', },
    { '4K人物': '4krenwu', },
    { '4K宗教': '4kzongjiao', },
    { '4K背景': '4kbeijing', },
    { '平板壁纸': 'pingban', },
    { '4K手机壁纸': 'shoujibizhi', },
]
// 定义目标URL
const url = 'http://pic.netbian.com/';
// 当前页数
let page = 1;
// 图片保存的目录
const savePath = `C:/\Users/\Administrator/\Downloads/\images`;
// 创建保存目录（如果不存在）
if (!fs.existsSync(savePath)) {
    fs.mkdirSync(savePath);
}
// 初始子目录
let subDir = '';

// 程序启动时间
let restartTime = 0
// 程序结束时间
let endTime = 0
console.log(restartTime);

// 控制台交互
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
// 图片下载
const downloadImage = async (src: string, name: string) => {
    await axios.get(`http://pic.netbian.com${src}`, {
        responseType: 'arraybuffer',
    }).then((response: { data: string | NodeJS.ArrayBufferView; }) => {
        // 将图片保存到本地
        fs.writeFileSync(`${savePath}/${subDir}/${name}.jpg`, response.data);
        console.log(`已下载图片：${name}`);
    }).catch((error: any) => {
        console.error('图片下载当中出现错误:\n', error);
    });
};

// 用于爬取基础网页
const spider = async (url: string, count: number) => {
    let errorFlag = false;
    while (page <= count && !errorFlag) {
        console.log(`\n-----------正在爬取第${page}页的数据-----------`);
        await axios.get(url, {
            responseType: 'arraybuffer',
            // 设置响应数据的编码为GBK
            transformResponse: [(data: WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>) => iconv.decode(Buffer.from(data), 'gbk')],
        }).then(async (response: { data: any; }) => {
            // 获取到的网页数据
            const html = response.data;
            // 将获取到的网页数据转换为DOM对象
            const root = parse(html);
            // 获取所有的大图片元素的地址
            const images = root.querySelectorAll('.slist .clearfix a');
            // 遍历所有的大图片元素的地址
            for (const image of images) {
                const src = image.getAttribute('href');
                let Url = `http://pic.netbian.com${src}`;
                await spiderBigImage(Url);
            }
            const next = root.querySelector('.page a:last-child');
            const nextUrl = `http://pic.netbian.com${next?.getAttribute('href')}`;
            page++;
            url = nextUrl;
        }).catch((error: { message: any; }) => {
            console.error('爬取网页过程中出现错误:\n', error.message);
            errorFlag = true;
        });
    }
    askExit();
    page = 1;
};

// 用于爬取大图
const spiderBigImage = async (url: string) => {
    //随机生成100毫秒-1秒的延迟，防止被封IP
    const delay = Math.floor(Math.random() * 1000) + 100;
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        // 设置响应数据的编码为GBK
        transformResponse: [(data: WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>) => iconv.decode(Buffer.from(data), 'gbk')],
    }).then(async (response: { data: any; }) => {
        // 获取网页内容
        const html = response.data;
        // 将获取到的网页数据转换为DOM对象
        const root = parse(html);
        const images = root.querySelectorAll('.photo-pic #img img');
        // 遍历所有的图片元素
        for (const image of images) {
            const src = image.getAttribute('src') as string;
            const name = image.getAttribute('alt') as string;
            // 控制爬虫速度
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve('');
                }, delay);
            }).then(async () => {
                // 下载图片
                await downloadImage(src, name);
            });
        }
    }).catch((error: any) => {
        console.error('获取图片过程中出现错误:', url);
    });
};

// 用于控制台交互
const consoleInteraction = () => {
    // 先输入爬取地址，再输入爬取页数
    rl.question('请输入爬取类型编号(仅限于当前菜单编号):', (answer) => {
        // 爬取网页
        let index = parseInt(answer);
        let spiderUrl = url + Object.values(menu[index - 1])[0];
        // 输入爬取页数
        rl.question('请输入爬取页数:', (answer) => {
            let count = parseInt(answer);
            // 赋值子目录
            subDir = Object.keys(menu[index - 1])[0];
            // 创建子目录（如果不存在）
            if (!fs.existsSync(`${savePath}/${subDir}`)) {
                fs.mkdirSync(`${savePath}/${subDir}`);
            }
            restartTime = new Date().getTime();
            console.log(`\n -----------开始爬取${Object.keys(menu[index - 1])[0]} 共计${count}页-----------`);
            spider(spiderUrl, count);
        });
    });
    // 监听控制台交互的关闭事件
    rl.on('close', () => {
        // 并且清理控制台信息
        console.log(`\n-----------程序爬取结束-----------`);

        process.exit(0);
    });
}
// 询问是否退出程序
const askExit = () => {
    endTime = new Date().getTime();
    console.log(`-----------当前爬取任务结束，共计耗时${(endTime - restartTime) / 1000}秒-----------\n`);
    console.log(`\n-------------爬取到的图片路径为：${savePath}-----------------\n`);
    rl.question('继续爬任务嘛？(y/n)', (answer) => {
        if (answer === 'y') {
            clearConsoleAndContinue()
        } else {
            rl.close();
        }
    });
}

// 用于控制台打印菜单
const Control = () => {
    console.log(`----------------------菜单--------------------------`);
    menu.forEach((item, index) => {
        console.log(`编号:${index + 1}  类型:${Object.keys(item)}   爬取地址:${url + Object.values(item)}`);
    });
    console.log('--------------------------------------------------\n');
    console.log('仅支持当前菜单数据爬取，如需爬取其他类型，请联系作者。');
    consoleInteraction();
}

// 清空控制台并保留控制台事件
const clearConsoleAndContinue = () => {
    // 清空控制台屏幕，并将光标移动到控制台的起始位置
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    // 进行后续操作
    Control();
}

Control()




