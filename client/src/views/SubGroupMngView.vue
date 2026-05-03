<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGroupStore } from '@/stores/group';
import { useUserStore } from '@/stores/user';
import { request, toSafeString } from '@/utils/fetch';
import AppHeader from '@/components/AppHeader.vue';
import toast from '@/utils/toast';
import dialog from '@/utils/dialog';
import MemberChip from '@/components/MemberChip.vue';
import IconHouse from '@/components/icons/IconHouse.vue';

const router = useRouter();
const route = useRoute();
const groupStore = useGroupStore();
const userStore = useUserStore();

/** @type {{ id: number|null, name: string, members: number[], isNew: boolean }[]} */
const vmSubGroups = ref([]);
const vmSelectedSubGroupIndex = ref(-1);
const vmSelectedSubGroupMembers = ref([]);
const vmNewSubGroupName = ref('');

const grpId = computed(() => toSafeString(route.params.grpId));

const nowSubGroupMembers = computed(() => {
  if (vmSelectedSubGroupIndex.value === -1) {
    return;
  }
  const memberIds = [...vmSelectedSubGroupMembers.value, ...(vmSubGroups.value[vmSelectedSubGroupIndex.value]?.members || [])].filter(
    (id, index, array) => array.indexOf(id) === index,
  );
  memberIds.sort((a, b) => a - b);
  return memberIds.map((id) => groupStore.getMemberById(id));
});

// サブグループ管理メソッド
function addSubGroup() {
  const name = vmNewSubGroupName.value.trim();
  if (name) {
    vmSubGroups.value.push({ id: null, name, members: [], isNew: true });
    vmNewSubGroupName.value = '';
    vmSelectedSubGroupMembers.value = [];
    vmSelectedSubGroupIndex.value = vmSubGroups.value.length - 1;
  }
}

function setSubGroupMembers() {
  const index = vmSelectedSubGroupIndex.value;
  if (index < 0) return;

  vmSubGroups.value[index].members = [...vmSelectedSubGroupMembers.value];
}

function applySubGroupMembers() {
  const index = vmSelectedSubGroupIndex.value;
  if (index < 0) {
    vmSelectedSubGroupMembers.value = [];
  } else {
    vmSelectedSubGroupMembers.value = vmSubGroups.value[index].members || [];
  }
}

function removeThisSubGroup() {
  const index = vmSelectedSubGroupIndex.value;
  if (index < 0) return;

  vmSubGroups.value.splice(index, 1);
  vmSelectedSubGroupIndex.value = -1;
  vmSelectedSubGroupMembers.value = [];
}

async function editThisSubGroupName() {
  const index = vmSelectedSubGroupIndex.value;
  if (index < 0) return;

  const newName = await dialog.prompt('サブグループの新しい名前を入力してください');
  if (newName !== null) {
    vmSubGroups.value[index].name = newName.trim();
  }
}

async function submit() {
  try {
    const add = vmSubGroups.value.filter((sg) => sg.isNew).map((sg) => ({ name: sg.name, members: sg.members }));
    const names = vmSubGroups.value.filter((sg) => !sg.isNew).map((sg) => ({ id: sg.id, name: sg.name }));
    const members = vmSubGroups.value.filter((sg) => !sg.isNew).map((sg) => ({ id: sg.id, members: sg.members }));
    const remove = groupStore.g.subGroups.filter((sg) => !vmSubGroups.value.some((vsg) => !vsg.isNew && vsg.id === sg.id)).map((sg) => sg.id);
    userStore.isLoading = true;
    await request(`/g/${grpId.value}/sub-groups`, {
      method: 'PATCH',
      body: { add, names, members, remove },
    });
    toast.message('サブグループを更新しました');
    router.push({ name: 'GroupHome', params: { grpId: grpId.value } });
  } catch (error) {
    toast.alert('サブグループの更新に失敗しました');
    console.error(error);
  } finally {
    userStore.isLoading = false;
  }
}

onMounted(async () => {
  await groupStore.init(grpId.value);
  vmSubGroups.value = groupStore.g.subGroups.map((sg) => ({ id: sg.id, name: sg.name, members: sg.members, isNew: false }));
});
</script>

<template>
  <div class="views sub-group-mng-view">
    <AppHeader>
      <li>
        <button @click="router.push({ name: 'GroupHome', params: { grpId } })" title="グループ設定">
          <IconHouse size="2.2rem" />
        </button>
      </li>
    </AppHeader>

    <main class="app-content">
      <header class="hero">
        <h1>サブグループの編集</h1>
        <p>このグループのサブグループを編集します</p>
      </header>

      <main>
        <section>
          <label>
            <span>新しいサブグループの名前</span>
            <div>
              <input
                type="text"
                v-model="vmNewSubGroupName"
                @keydown.enter.prevent="addSubGroup"
                placeholder="新しいサブグループ名を入力: 宿泊組, 食事組..."
              />
              <button class="add-subgroup" type="button" @click="addSubGroup" :disabled="vmNewSubGroupName.trim() === ''">追加</button>
            </div>
          </label>

          <div class="two-column-row">
            <label>
              <span>サブグループを選択</span>
              <select v-model="vmSelectedSubGroupIndex" @change="applySubGroupMembers()">
                <option value="-1">サブグループを選択</option>
                <option v-for="(sg, i) in vmSubGroups" :key="i" :value="i">{{ sg.name }}</option>
              </select>
              <div v-if="vmSelectedSubGroupIndex >= 0" class="subgroup-actions">
                <button class="remove-subgroup" @click="removeThisSubGroup()">削除</button>
                <button class="edit-subgroup" @click="editThisSubGroupName()">名前を変更</button>
              </div>
            </label>
            <label>
              <span>メンバーを選択</span>
              <select v-model="vmSelectedSubGroupMembers" multiple @change="setSubGroupMembers()">
                <option v-for="(mm, i) in groupStore.g.members" :key="i" :value="mm.id">{{ mm.banner }}</option>
              </select>
            </label>
          </div>

          <h2>メンバー</h2>
          <div v-if="!nowSubGroupMembers" class="empty">
            <p>サブグループが選択されていません</p>
          </div>
          <div v-else-if="nowSubGroupMembers.length === 0" class="empty">
            <p>このサブグループにはメンバーがいません</p>
          </div>
          <ul v-else class="member-list">
            <MemberChip v-for="(mm, i) in nowSubGroupMembers" :key="i" :banner="mm.banner" />
          </ul>
        </section>
      </main>

      <footer>
        <button @click="router.push({ name: 'GroupHome', params: { grpId } })">変更を保存せずにホームに戻る</button>
        <button @click="submit">変更を保存</button>
      </footer>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as var;

main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

section {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.2rem;
  background-color: var(--bg-0);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;

  & > div {
    display: flex;
    gap: 0.4rem;

    input {
      flex-grow: 1;
    }
  }

  & > span {
    font-weight: 500;
    font-size: 0.95rem;
    color: var(--text-0);
  }

  input {
    display: block;
    height: 100%;
  }
}

.two-column-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;

  @include var.narrow {
    grid-template-columns: 1fr;
  }
}

// サブグループアクション
.subgroup-actions {
  display: flex;
  gap: 0.3rem;
  button {
    padding: 0.4rem 1.2rem;
    border-radius: var(--border-radius);
    border: none;
    color: var(--text-0);
    background-color: var(--bg-1);
    @include var.buttonAnimation();
  }
  .remove-subgroup {
    color: var(--danger);
  }

  .edit-subgroup {
    color: var(--text-0);
  }
}

// メンバーリスト
.member-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  list-style: none;
  padding: 0;
  margin: 0;
  background-color: var(--bg-1);
  padding: 1rem;
  border-radius: var(--border-radius);
}

button.add-subgroup {
  padding: 0 1.2rem;
  border: none;
  border-radius: var(--border-radius);
  background-color: var(--primary);
  color: white;

  @include var.buttonAnimation();
}

footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  button {
    border: none;
    border-radius: var(--border-radius);
    width: 16rem;
    height: 2rem;
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
      filter: brightness(1.05);
    }

    &:last-child {
      background-color: var(--primary);
    }

    @include var.narrow() {
      width: 100%;
    }
  }
}
</style>
