const { src, dest, parallel, series, watch } = require('gulp')

const del = require('del')
const browserSync = require('browser-sync')

const loadPlugins = require('gulp-load-plugins')

const plugins = loadPlugins()
const bs = browserSync.create()
const cwd = process.cwd() // 当前项目所在目录
let config = {
    // defauly config
    build: {
        temp: 'temp',
        src: 'src',
        dist: 'dist',
        public: 'public',
        paths: {
            styles: 'assets/styles/*.scss',
            scripts: 'assets/scripts/*.js',
            images: 'assets/images/**',
            fonts: 'assets/fonts/**',
            pages: '*.html',
        }
    }
}

try {
    const loadConfig = require(`${cwd}/pages.config.js`)
    config = Object.assign({}, config, loadConfig)
} catch (e) { }

const clean = () => {
    return del([config.build.dist, config.build.temp])
}

const style = () => {
    return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.sass({ outputStyle: 'expanded' }))
        .pipe(dest('temp'))
        .pipe(bs.reload({ stream: true }))
}

const script = () => {
    return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
        // babel只是提供了代码转换的平台怒，preset-env是babel插件的集合，需要使用reset-env可以将所有特性进行转换
        .pipe(plugins.babel({ perset: [require('@babel/preset-env')] }))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}

const page = () => {
    return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
        // 使用swig模版
        .pipe(plugins.swig({ data: config.data, cache: false }))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}

const image = () => {
    return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

const font = () => {
    return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

const extra = () => {
    return src('**', { base: config.build.public, cwd: config.build.public })
        .pipe(dest(config.build.dist))
}

const serve = () => {
    watch(config.build.paths.styles, { cwd: config.build.src }, style)
    watch(config.build.paths.scripts, { cwd: config.build.src }, script)
    watch(config.build.paths.pages, { cwd: config.build.src }, page)
    watch([
        config.build.paths.images,
        config.build.paths.fonts
    ], { cwd: config.build.src }, bs.reload())

    watch('**', { cwd: config.build.public }, bs.reload())

    // 初始化web server
    bs.init({
        server: {
            // 查找dist资源，找不到往下找src、public目录
            baseDir: ['temp', 'src', 'public'],
            notify: false, // 关闭是否连接提示
            prot: 8082, // 默认端口
            // open: false, // 浏览器是否自动打开
            // files: 'dist/**', // 自动更新文件路径
            // 将特殊路由映射
            routes: {
                '/node_modules': 'node_modules'
            }
        }
    })
}

const useref = () => {
    return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
        .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
        .pipe(plugins.if(/\.js$/, plugins.uglify()))
        .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
        .pipe(plugins.if(/\.html$/, plugins.htmlmin({ collapseWhitespcae: true, minifyCSS: true, minifyJS: true })))
        .pipe(dest(config.build.dist))
}
// 并行执行 parallel series 串行执行
const compile = parallel(page, script, style)
const build = series(clean, parallel(series(compile, useref), image, font, extra))
const develop = series(compile, serve)
module.exports = {
    clean,
    build,
    develop
}