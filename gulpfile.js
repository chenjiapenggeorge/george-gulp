const { src, dest, parallel, series, watch } = require('gulp')

const del = require('del')
const browserSync = require('browser-sync')

const loadPlugins = require('gulp-load-plugins')

const plugins = loadPlugins()
const bs = browserSync.create()

const clean = () => {
    return del(['dist', 'temp'])
}

const style = () => {
    return src('src/assets/styles/*.scss', { base: 'src' })
        .pipe(plugins.sass({ outputStyle: 'expanded' }))
        .pipe(dest('temp'))
        .pipe(bs.reload({ stream: true }))
}

const script = () => {
    return src('src/assets/script/*.js', { base: 'src' })
        // babel只是提供了代码转换的平台怒，preset-env是babel插件的集合，需要使用reset-env可以将所有特性进行转换
        .pipe(plugins.babel({ perset: ['@babel/preset-env'] }))
        .pipe(dest('temp'))
        .pipe(bs.reload({ stream: true }))
}

const page = () => {
    return src('src/*.html', { base: 'src' })
        // 使用swig模版
        .pipe(plugins.swig({ cache: false }))
        .pipe(dest('temp'))
        .pipe(bs.reload({ stream: true }))
}

const image = () => {
    return src('src/assets/images/**', { base: 'src' })
        .pipe(plugins.imagemin())
        .pipe(dest('dist'))
}

const font = () => {
    return src('src/assets/fonts/**', { base: 'src' })
        .pipe(plugins.imagemin())
        .pipe(dest('dist'))
}

const extra = () => {
    return src('public/**', { base: 'public' })
        .pipe(dest('dist'))
}

const serve = () => {
    watch('src/assets/styles/*.scss', style)
    watch('src/assets/scripts/*.js', script)
    watch('src/*.html', page)
    // watch('src/assets/images/*.scss', image)
    // watch('src/assets/fonts/*.scss', font)
    // watch('public/**', extra)
    watch([
        'src/assets/images/**',
        'src/assets/fonts/**',
        'public/**'
    ], bs.reload())

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
    return src('temp/*.html', { base: 'dist' })
        .pipe(plugins.useref({ searchPath: ['dist', '.'] }))
        .pipe(plugins.if(/\.js$/, plugins.uglify()))
        .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
        .pipe(plugins.if(/\.html$/, plugins.htmlmin({ collapseWhitespcae: true, minifyCSS: true, minifyJS: true })))
        .pipe(dest('dist'))
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