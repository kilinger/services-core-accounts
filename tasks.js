// tasks.js
import Start from 'start';
import env from 'start-env';
import reporter from 'start-pretty-reporter';
import files from 'start-files';
import watch from 'start-watch';
import clean from 'start-clean';
import read from 'start-read';
import babel from 'start-babel';
import write from 'start-write';
import eslint from 'start-eslint';
import mocha from 'start-mocha';
import * as istanbul from 'start-istanbul';
import codecov from 'start-codecov';

import babelIstanbul from 'babel-istanbul';

const start = Start(reporter());

export function build() {
    return start(
        files('lib/'),
        clean(),
        files('src/**/*.js'),
        read(),
        babel(),
        write('lib/')
    );
}

export function dev() {
    return start(
        files('lib/'),
        clean(),
        files('src/**/*.js'),
        watch(file => start(
            files(file),
            read(),
            babel(),
            write('lib/')
        ))
    );
}

export function lint() {
    return start(
        files([ 'src/**/*.js', 'test/**/*.js', 'db/**/*.js' ]),
        eslint()
    );
}

export function test() {
    return start(
        env('test', () => start(
            files('test/**/*.js'),
            mocha()
        ))
    );
}

export function tdd() {
    return start(
        files([ 'src/**/*.js', 'test/**/*.js' ]),
        watch(test)
    );
}

export function coverage() {
    return start(
        files('coverage/'),
        clean(),
        files('src/**/*.js'),
        istanbul.instrument(babelIstanbul),
        test,
        istanbul.report()
    );
}

export function travis() {
    return start(
        lint,
        coverage,
        files('coverage/lcov.info'),
        read(),
        codecov()
    );
}
