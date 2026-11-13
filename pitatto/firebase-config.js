/* ぴたっとシンクロ ── Firebase の設定（みんなのスマホで遊ぶ部屋を Firestore で共有するため）
 * 究極の二択・ワンソナと同じ Firebase プロジェクト（typeplus-69c66）を使う。
 * apiKey などは公開してよい値です（秘密の鍵ではありません）。
 * null にすると、みんなのスマホで遊ぶ部屋だけが動かなくなり、ひとりで・1台を回しては、ふつうに使えます。 */
window.PITATTO_FB = {
  apiKey: "AIzaSyCS3ijFH8Y67oILeIcAYXPfUMvvYA9eGLk",
  authDomain: "typeplus-69c66.firebaseapp.com",
  projectId: "typeplus-69c66",
  storageBucket: "typeplus-69c66.firebasestorage.app",
  messagingSenderId: "263347336943",
  appId: "1:263347336943:web:724a41f58d1694ce2ccd1a"
};
