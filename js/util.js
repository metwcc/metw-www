const icons = {
    report: '<i class="bi bi-flag"></i>',
    edit: '<i class="bi bi-pencil-square"></i>',
    delete: '<i class="bi bi-trash"></i>',
    comment: '<i class="bi bi-chat-square-text"></i>',
    like: '<i class="bi bi-heart"></i>',
    share: '<i class="bi bi-share"></i>',
    dots: '<i class="bi bi-three-dots-vertical"></i>',
    reply: '<i class="bi bi-reply"></i>',
    x: '<i class="bi bi-x"></i>',
    accept: '<i class="bi bi-check"></i>'
}
const url = (window.location.hostname == 'www.metw.cc' || location.hostname.endsWith('.onion')) ?
    { backend: 'https://api.metw.cc/v1', cdn: 'https://cdn.metw.cc', ws: 'wss://api.metw.cc/v1/ws' } :
    { backend: 'http://api.utb.metw/utb', cdn: 'https://cdn.metw.cc/utb', ws: 'ws://api.metw/utb/ws' }
const publicVapidKey = 'BKN8z1ZV6W03lysfQx6Dm5MQounUoaad_f-VG2phhxdxZfOF-PX24Jz-S-MufPSIXd183Bz14__F0krdsqxvT2c'
