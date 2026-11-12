/* 究極の二択 ── Firebase の設定（みんなで遊ぶ部屋・みんなの回答％を Firestore で共有するため）
 * Firebase の画面「プロジェクトの設定 → マイアプリ（ウェブアプリ）」に出る firebaseConfig の中身を、
 * 下の null のところにそのまま貼ってください（apiKey などは公開してよい値です。秘密の鍵ではありません）。
 * null のままのときは、部屋と回答％は動かず、ひとりで遊ぶのはふつうに使えます。
 *
 * 例：
 * window.NITAKU_FB = {
 *   apiKey: "....",
 *   authDomain: "typeplus-69c66.firebaseapp.com",
 *   projectId: "typeplus-69c66",
 *   storageBucket: "....",
 *   messagingSenderId: "....",
 *   appId: "...."
 * };
 */
window.NITAKU_FB = null;
