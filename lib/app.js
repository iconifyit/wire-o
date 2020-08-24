'use strict';

process.env['PATH'] = `${process.env['PATH']}:${process.env['LAMBDA_TASK_ROOT']}/bin`;
process.env['LD_LIBRARY_PATH'] = `${process.env['LAMBDA_TASK_ROOT']}/bin`;

import "core-js/stable";
import "regenerator-runtime/runtime";
import uploadToS3 from './uploadToS3';
import storePDF from './storePdf';
import fetch from 'node-fetch';
import Promise from 'bluebird';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import formatDate from './formatDate';

fetch.Promise = Promise;

const
    bucket = process.env.s3BucketName
    , prefix = 'merged'
    , storage = uploadToS3({ bucket, prefix })
    , uploadPDF = storePDF({ storage })

/**
 * Downloads a single file to S3 bucket by URL.
 * @param url
 * @param filename
 * @returns {Promise<*>}
 */
const downloadSingleFileToS3 = async (url, filename) => {

    const
        bucket = process.env.s3BucketName
        , prefix = formatDate(false)
        , storage = uploadToS3({ bucket, prefix })
        , uploadPDF = storePDF({ storage })

    const buffer = await getFileBuffer(url);

    console.log( '@@ DOWNLOAD TO S3 (BUFFER) @@', buffer )

    return await uploadPDF( buffer, filename );
}

/**
 * Gets a promise to a file buffer from URL.
 * @param url
 * @returns {Promise<*>}
 */
const getFileBuffer = async (url) => {
    const res = await fetch(url, {
        redirect : 'follow',
        encoding : null
    })
    const buffer = await res.buffer();
    console.log('@@@ GET FILE BUFFER @@@', buffer)
    return buffer;
}

/**
 * Downloads PDF from a URL into S3 bucket.
 * @param urls
 * @returns {Promise<[]>}
 */
const downloadFilesToS3 = async (urls) => {
    const pdfs = [];

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const
            file = decodeURI(url)
                .split('/')
                .pop()
                .split(' ')
                .join('-')
                .replace('?dl=1', '')

        pdfs.push(await downloadSingleFileToS3(url, file))
    }

    return pdfs;
}

/**
 * Merges a list of PDFs into a single PDF.
 * @param pdfs
 * @returns {Promise<Uint8Array>}
 */
const doMergePdfs = async (pdfs) => {

    const
        merged = await PDFDocument.create()
        , urls = await downloadFilesToS3(pdfs)

    console.log('@@ URLS @@', urls)

    for (const url of urls) {
        const
            buffer  = await getFileBuffer(url)
            , pdf   = await PDFDocument.load(buffer)
            , pages = await merged.copyPages(pdf, pdf.getPageIndices())

        pages.forEach((page) => {
            merged.addPage(page);
        });
    }
    return await merged.save();
}

/**
 * Main Lambda handler.
 * @param event
 * @param context
 * @returns {Promise<{url: *}>}
 */
exports.handler = async (event, context) => {
    const
        merged = await doMergePdfs(event.body.pdfUrls)
        , url  = await uploadPDF(Buffer.from(merged.buffer));

    console.log('### RESULT ###', merged)
    console.log('@@@ RETURN @@@', url);
    return { "url" : url };
}
