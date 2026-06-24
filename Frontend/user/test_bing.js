import { translate } from 'bing-translate-api';
translate('Hello', null, 'as').then(res => console.log(res)).catch(err => console.error(err));
