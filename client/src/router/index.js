import { createRouter, createWebHistory } from 'vue-router';
import GroupMngView from '@/views/GroupMngView.vue';
import GroupHomeView from '@/views/GroupHomeView.vue';
import PaymentMngView from '@/views/PaymentMngView.vue';
import SubGroupMngView from '@/views/SubGroupMngView.vue';
import IndexPageView from '@/views/IndexPageView.vue';

const defaultTitle = '立替清算アプリ';
const defaultDescription = '立替金額や返済ルートを記録・管理できる、グループ向けの精算アプリです。';

function applyHead(route) {
  const title = route.meta.title ? `${route.meta.title} | ${defaultTitle}` : defaultTitle;
  const description = route.meta.description || defaultDescription;

  document.title = title;

  let descriptionTag = document.querySelector('meta[name="description"]');
  if (!descriptionTag) {
    descriptionTag = document.createElement('meta');
    descriptionTag.setAttribute('name', 'description');
    document.head.appendChild(descriptionTag);
  }

  descriptionTag.setAttribute('content', description);
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      name: 'NewGroup',
      component: GroupMngView,
      path: '/new',
      props: { inNewMode: true },
      meta: {
        title: 'グループ作成',
        description: '立替管理を始めるためのグループを新規作成',
      },
    },
    {
      name: 'GroupHome',
      component: GroupHomeView,
      path: '/g/:grpId',
      meta: {
        title: 'グループホーム',
        description: 'グループのメンバー、支払い、精算状況を確認',
      },
    },
    {
      name: 'NewPayment',
      component: PaymentMngView,
      path: '/g/:grpId/new',
      props: { inNewMode: true, isRepayment: false },
      meta: {
        title: '支払いを追加',
        description: '立替の支払い情報を新しく登録',
      },
    },
    {
      name: 'EditGroup',
      component: GroupMngView,
      path: '/g/:grpId/edit',
      props: { inNewMode: false },
      meta: {
        title: 'グループを編集',
        description: 'グループ名、メンバー、通貨などの設定を変更',
      },
    },
    {
      name: 'NewRepayment',
      component: PaymentMngView,
      path: '/g/:grpId/new-rp',
      props: { inNewMode: true, isRepayment: true },
      meta: {
        title: '返済を追加',
        description: '返済として記録する支払いを新しく登録',
      },
    },
    {
      name: 'EditPayment',
      component: PaymentMngView,
      path: '/g/:grpId/edit/:payId',
      props: { inNewMode: false, isRepayment: false },
      meta: {
        title: '支払いを編集',
        description: '登録済みの支払い内容を編集',
      },
    },
    {
      name: 'EditRepayment',
      component: PaymentMngView,
      path: '/g/:grpId/edit-rp/:payId',
      props: { inNewMode: false, isRepayment: true },
      meta: {
        title: '返済を編集',
        description: '登録済みの返済内容を編集',
      },
    },
    {
      name: 'EditSubGroup',
      component: SubGroupMngView,
      path: '/g/:grpId/subgroup',
      meta: {
        title: 'サブグループを編集',
        description: 'グループ内のサブグループ設定を編集',
      },
    },
    {
      name: 'IndexPage',
      component: IndexPageView,
      path: '/',
      meta: {
        title: 'ホーム',
        description: '立替清算アプリの概要と、グループ参加・作成の入口',
      },
    },
  ],
});

router.afterEach((to) => {
  applyHead(to);
});

applyHead(router.currentRoute.value);

export default router;
