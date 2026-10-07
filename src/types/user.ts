export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

export type UserDirectoryEntry = Pick<ChatUser, 'uid' | 'name' | 'photoUrl'>;
